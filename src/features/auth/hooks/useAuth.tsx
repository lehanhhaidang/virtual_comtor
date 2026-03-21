'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '../api/authApi';
import type { AuthUser, LoginCredentials, RegisterCredentials } from '@/types/auth.types';
import { deriveWrappingKey, unwrapDataKey, fromBase64 } from '@/lib/crypto';

// ---------------------------------------------------------------------------
// IndexedDB helpers for CryptoKey persistence
// ---------------------------------------------------------------------------
const DB_NAME = 'vcomtor_crypto';
const STORE_NAME = 'keys';
const KEY_ID = 'dataKey';

/** Open (or create) the IndexedDB database. */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Save a CryptoKey to IndexedDB. */
async function saveKeyToIDB(key: CryptoKey): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(key, KEY_ID);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Load a CryptoKey from IndexedDB. Returns null if not found. */
async function loadKeyFromIDB(): Promise<CryptoKey | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(KEY_ID);
      req.onsuccess = () => resolve((req.result as CryptoKey) ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

/** Delete the CryptoKey from IndexedDB. */
async function deleteKeyFromIDB(): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(KEY_ID);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Silently ignore — key may not exist
  }
}

// ---------------------------------------------------------------------------
// Auth Context
// ---------------------------------------------------------------------------

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  getDataKey: () => Promise<CryptoKey | null>;
}

const AuthContext = createContext<AuthContextType | null>(null);

/**
 * Auth provider — manages user session state and E2EE data key.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Check session on mount + try restoring key from IDB
  useEffect(() => {
    const checkSession = async () => {
      try {
        const me = await authApi.getMe();
        setUser(me);
      } catch {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    checkSession();
  }, []);

  const login = useCallback(
    async (credentials: LoginCredentials) => {
      const { user: loggedInUser, encryptedDataKey, keySalt } =
        await authApi.login(credentials);

      // Derive wrapping key from password and unwrap the data key
      const wrappingKey = await deriveWrappingKey(
        credentials.password,
        fromBase64(keySalt)
      );
      const dataKey = await unwrapDataKey(encryptedDataKey, wrappingKey);
      await saveKeyToIDB(dataKey);

      setUser(loggedInUser);
      router.push('/projects');
    },
    [router]
  );

  const register = useCallback(
    async (credentials: RegisterCredentials) => {
      await authApi.register(credentials);
      router.push('/login?registered=true');
    },
    [router]
  );

  const logout = useCallback(async () => {
    await deleteKeyFromIDB();
    await authApi.logout();
    setUser(null);
    router.push('/login');
  }, [router]);

  const refreshUser = useCallback(async () => {
    try {
      const me = await authApi.getMe();
      setUser(me);
    } catch {
      // silently ignore
    }
  }, []);

  /** Retrieve the E2EE data key from IndexedDB. */
  const getDataKey = useCallback(async (): Promise<CryptoKey | null> => {
    return loadKeyFromIDB();
  }, []);

  const value = useMemo(() => ({
    user, isLoading, login, register, logout, refreshUser, getDataKey,
  }), [user, isLoading, login, register, logout, refreshUser, getDataKey]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to access auth context.
 * Must be used within AuthProvider.
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
