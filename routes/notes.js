import express from 'express';
import { Note } from '../models/Note.js';
import { validateNote, validateNotePatch, validateListQuery } from '../validation/notes.js';
import { validateObjectId } from '../middleware/validateObjectId.js';

// Mounted behind requireAuth in server.js, so req.userId is always set here.
// Authorization: every query includes userId, so someone else's note looks
// exactly like a note that doesn't exist (404).
const notesRouter = express.Router();

const NOT_FOUND = { error: 'Note not found' };

// Return the updated note, not the old one, and enforce the schema rules on
// updates too. (returnDocument: 'after' is Mongoose 9's name for new: true.)
const UPDATE_OPTIONS = { returnDocument: 'after', runValidators: true };

// Escape user input before putting it in a regex: "c++" or "(" must be
// searched literally, not crash the query.
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function sendValidationError(res, errors) {
  return res.status(400).json({ error: 'Validation failed', details: errors });
}

// GET /api/notes?search=&tag=&sort=newest|oldest&limit=20 — list my notes
notesRouter.get('/', async (req, res) => {
  const { errors, data } = validateListQuery(req.query);
  if (errors) return sendValidationError(res, errors);
  const { search, tag, sort, limit } = data;

  const filter = { userId: req.userId };
  if (search) {
    const re = { $regex: escapeRegex(search), $options: 'i' };
    filter.$or = [{ title: re }, { body: re }];
  }
  if (tag) filter.tags = tag;

  const notes = await Note.find(filter)
    .sort({ createdAt: sort === 'newest' ? -1 : 1 })
    .limit(limit);
  res.json(notes);
});

// GET /api/notes/:id — read one
notesRouter.get('/:id', validateObjectId, async (req, res) => {
  const note = await Note.findOne({ _id: req.params.id, userId: req.userId });
  if (!note) return res.status(404).json(NOT_FOUND);
  res.json(note);
});

// POST /api/notes — create (owner comes from the token)
notesRouter.post('/', async (req, res) => {
  const { errors, data } = validateNote(req.body);
  if (errors) return sendValidationError(res, errors);
  const note = await Note.create({ ...data, userId: req.userId });
  res.status(201).json(note);
});

// PUT /api/notes/:id — replace the whole note (missing fields reset to defaults)
notesRouter.put('/:id', validateObjectId, async (req, res) => {
  const { errors, data } = validateNote(req.body);
  if (errors) return sendValidationError(res, errors);
  const note = await Note.findOneAndUpdate(
    { _id: req.params.id, userId: req.userId },
    data,
    UPDATE_OPTIONS
  );
  if (!note) return res.status(404).json(NOT_FOUND);
  res.json(note);
});

// PATCH /api/notes/:id — change only the fields that were sent
notesRouter.patch('/:id', validateObjectId, async (req, res) => {
  const { errors, data } = validateNotePatch(req.body);
  if (errors) return sendValidationError(res, errors);
  const note = await Note.findOneAndUpdate(
    { _id: req.params.id, userId: req.userId },
    { $set: data },
    UPDATE_OPTIONS
  );
  if (!note) return res.status(404).json(NOT_FOUND);
  res.json(note);
});

// DELETE /api/notes/:id — delete, then say nothing (204 has no body)
notesRouter.delete('/:id', validateObjectId, async (req, res) => {
  const note = await Note.findOneAndDelete({ _id: req.params.id, userId: req.userId });
  if (!note) return res.status(404).json(NOT_FOUND);
  res.status(204).end();
});

export default notesRouter;
