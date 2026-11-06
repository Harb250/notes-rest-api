import 'dotenv/config'; // first line: load .env before anything reads it
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import authRouter from './routes/auth.js';
import notesRouter from './routes/notes.js';
import { requireAuth } from './middleware/requireAuth.js';
import { notFound, errorHandler } from './middleware/errors.js';

const dbUri = process.env.MONGODB_URI;
const port = Number(process.env.PORT) || 3000;

// Fail fast with a clear message instead of "secretOrPrivateKey required" later.
if (!dbUri || !process.env.JWT_SECRET) {
  console.error('Missing MONGODB_URI or JWT_SECRET. Copy .env.example to .env and fill it in.');
  process.exit(1);
}

const app = express();

// cors before the routes. With CLIENT_ORIGIN set, only that front end is allowed.
app.use(cors(process.env.CLIENT_ORIGIN ? { origin: process.env.CLIENT_ORIGIN } : {}));
app.use(express.json({ limit: '100kb' }));

// Public: health check, signup and login
app.get('/api/health', (req, res) => {
  const db = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({ status: 'ok', db });
});
app.use('/api/auth', authRouter);

// Locked: every notes route needs a valid token
app.use('/api/notes', requireAuth, notesRouter);

// Anything else: JSON 404, and one place that turns errors into JSON responses
app.use(notFound);
app.use(errorHandler);

// Connect first, then listen
try {
  await mongoose.connect(dbUri);
  console.log('Connected to MongoDB');
  app.listen(port, () => console.log(`API listening on :${port}`));
} catch (err) {
  console.error('DB connection failed:', err.message);
  process.exit(1);
}
