import { SignJWT, jwtVerify, type JWTPayload } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'dev_jwt_secret_change_in_production_32chars'
);

const JWT_REFRESH_SECRET = new TextEncoder().encode(
  process.env.JWT_REFRESH_SECRET || 'dev_jwt_refresh_secret_change_in_production'
);

export interface TokenPayload extends JWTPayload {
  userId: string;
  email: string;
}

/**
 * Sign a JWT access token (short-lived).
 */
export async function signAccessToken(payload: {
  userId: string;
  email: string;
}): Promise<string> {
  const expiry = process.env.JWT_ACCESS_EXPIRY || '15m';

  return new SignJWT({ userId: payload.userId, email: payload.email })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiry)
    .sign(JWT_SECRET);
}

/**
 * Sign a JWT refresh token (long-lived).
 */
export async function signRefreshToken(payload: {
  userId: string;
  email: string;
}): Promise<string> {
  const expiry = process.env.JWT_REFRESH_EXPIRY || '7d';

  return new SignJWT({ userId: payload.userId, email: payload.email })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiry)
    .sign(JWT_REFRESH_SECRET);
}

/**
 * Verify and decode an access token.
 */
export async function verifyAccessToken(
  token: string
): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as TokenPayload;
  } catch {
    return null;
  }
}

/**
 * Verify and decode a refresh token.
 */
export async function verifyRefreshToken(
  token: string
): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_REFRESH_SECRET);
    return payload as TokenPayload;
  } catch {
    return null;
  }
}
