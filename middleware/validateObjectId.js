import mongoose from 'mongoose';

// 400 for an id that can't be an ObjectId (e.g. /api/notes/abc), so the
// route only ever runs with a valid id: then "no such note" is a clean 404.
export function validateObjectId(req, res, next) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ error: 'Invalid note id' });
  }
  next();
}
