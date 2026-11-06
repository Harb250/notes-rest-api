import express from 'express';
import bcrypt from 'bcrypt';
import { User } from '../models/User.js';
import { signToken } from '../auth/token.js';
import { validateCredentials } from '../validation/auth.js';

const SALT_ROUNDS = 12;
const authRouter = express.Router();

// Never send the hash back — only the public fields.
const publicUser = (user) => ({ id: user._id, email: user.email });

// POST /api/auth/signup — validate, hash, save, sign
authRouter.post('/signup', async (req, res) => {
  const { errors, data } = validateCredentials(req.body);
  if (errors) {
    return res.status(400).json({ error: 'Validation failed', details: errors });
  }
  const { email, password } = data;

  if (await User.findOne({ email })) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await User.create({ email, passwordHash });
  res.status(201).json({ token: signToken(user), user: publicUser(user) });
});

// POST /api/auth/login — find, compare, sign
authRouter.post('/login', async (req, res) => {
  const { errors, data } = validateCredentials(req.body, { checkStrength: false });
  if (errors) {
    return res.status(400).json({ error: 'Validation failed', details: errors });
  }
  const { email, password } = data;

  const user = await User.findOne({ email });
  const ok = user && (await bcrypt.compare(password, user.passwordHash));
  // Same message either way, so attackers can't learn which emails exist.
  if (!ok) return res.status(401).json({ error: 'Invalid email or password' });

  res.json({ token: signToken(user), user: publicUser(user) });
});

export default authRouter;
