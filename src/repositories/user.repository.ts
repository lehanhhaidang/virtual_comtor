import User, { type IUser } from '@/models/User';
import connectDB from '@/lib/db';

/**
 * User repository — all database operations for User model.
 */
export const userRepository = {
  /**
   * Find user by email. Includes password for auth.
   */
  async findByEmail(email: string): Promise<IUser | null> {
    await connectDB();
    return User.findOne({ email }).select('+password');
  },

  /**
   * Find user by email. Includes password + encryption keys for login.
   */
  async findByEmailWithKeys(email: string): Promise<IUser | null> {
    await connectDB();
    return User.findOne({ email }).select('+password +encryptedDataKey +keySalt');
  },

  /**
   * Find user by ID. Does NOT include password or keys.
   */
  async findById(id: string): Promise<IUser | null> {
    await connectDB();
    return User.findById(id);
  },

  /**
   * Create a new user.
   */
  async create(data: {
    email: string;
    password: string;
    name: string;
    encryptedDataKey: string;
    keySalt: string;
  }): Promise<IUser> {
    await connectDB();
    const user = new User(data);
    return user.save();
  },

  /**
   * Check if email already exists.
   */
  async emailExists(email: string): Promise<boolean> {
    await connectDB();
    const count = await User.countDocuments({ email });
    return count > 0;
  },

  /**
   * Update user fields by ID.
   */
  async updateById(
    id: string,
    data: Partial<{ name: string; password: string; encryptedDataKey: string }>
  ): Promise<IUser | null> {
    await connectDB();
    return User.findByIdAndUpdate(id, { $set: data }, { new: true });
  },
};
