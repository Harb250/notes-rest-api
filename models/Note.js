import mongoose from 'mongoose';

export const TITLE_MAX = 120;
export const BODY_MAX = 10000;
export const TAGS_MAX = 10;
export const TAG_MAX = 30;

const noteSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: TITLE_MAX },
    body: { type: String, default: '', maxlength: BODY_MAX },
    tags: { type: [String], default: [] },
    // Reference to the owner. Always set from the token, never from the body.
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
  },
  { timestamps: true, versionKey: false } // adds createdAt and updatedAt; no __v
);

export const Note = mongoose.model('Note', noteSchema);
