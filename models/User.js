import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    // Only the bcrypt hash is stored — never the plain password.
    passwordHash: { type: String, required: true },
  },
  { timestamps: true, versionKey: false }
);

export const User = mongoose.model('User', userSchema);
