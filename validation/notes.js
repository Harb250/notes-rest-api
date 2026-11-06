import { TITLE_MAX, BODY_MAX, TAGS_MAX, TAG_MAX } from '../models/Note.js';

const FIELDS = ['title', 'body', 'tags'];

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function checkTitle(title, errors) {
  if (typeof title !== 'string' || title.trim() === '') {
    errors.title = 'title is required and must be a non-empty string';
  } else if (title.trim().length > TITLE_MAX) {
    errors.title = `title must be at most ${TITLE_MAX} characters`;
  }
}

function checkBody(body, errors) {
  if (typeof body !== 'string') {
    errors.body = 'body must be a string';
  } else if (body.length > BODY_MAX) {
    errors.body = `body must be at most ${BODY_MAX} characters`;
  }
}

function checkTags(tags, errors) {
  if (!Array.isArray(tags) || !tags.every((t) => typeof t === 'string')) {
    errors.tags = 'tags must be an array of strings';
  } else if (tags.length > TAGS_MAX) {
    errors.tags = `tags can hold at most ${TAGS_MAX} items`;
  } else if (tags.some((t) => t.trim() === '' || t.trim().length > TAG_MAX)) {
    errors.tags = `each tag must be 1-${TAG_MAX} characters`;
  }
}

// Trim, lowercase and de-duplicate tags: ['Exam', ' exam '] -> ['exam']
const cleanTags = (tags) => [...new Set(tags.map((t) => t.trim().toLowerCase()))];

// POST and PUT: the whole note is sent. title is required; a missing body or
// tags falls back to the default ('' / []) — PUT replaces the whole thing.
// Only whitelisted fields are copied, so the client can never set userId,
// _id or timestamps.
export function validateNote(input) {
  if (!isPlainObject(input)) {
    return { errors: { body: 'Request body must be a JSON object' } };
  }
  const { title, body = '', tags = [] } = input;
  const errors = {};
  checkTitle(title, errors);
  checkBody(body, errors);
  checkTags(tags, errors);

  if (Object.keys(errors).length) return { errors };
  return { data: { title: title.trim(), body, tags: cleanTags(tags) } };
}

// PATCH: only the fields that were sent are checked and changed. A title-only
// PATCH must not erase the body (the "!== undefined" check from the slides).
export function validateNotePatch(input) {
  if (!isPlainObject(input)) {
    return { errors: { body: 'Request body must be a JSON object' } };
  }
  if (!FIELDS.some((f) => input[f] !== undefined)) {
    return { errors: { body: `Send at least one of: ${FIELDS.join(', ')}` } };
  }
  const errors = {};
  const data = {};
  if (input.title !== undefined) {
    checkTitle(input.title, errors);
    if (!errors.title) data.title = input.title.trim();
  }
  if (input.body !== undefined) {
    checkBody(input.body, errors);
    if (!errors.body) data.body = input.body;
  }
  if (input.tags !== undefined) {
    checkTags(input.tags, errors);
    if (!errors.tags) data.tags = cleanTags(input.tags);
  }

  if (Object.keys(errors).length) return { errors };
  return { data };
}

// GET /api/notes?search=exam&tag=week9&sort=newest&limit=10
// Query values arrive as optional strings: give each a default and convert.
export function validateListQuery(query) {
  const { search = '', tag, sort = 'newest', limit = '20' } = query;
  const errors = {};

  if (typeof search !== 'string') errors.search = 'search must be a single string';
  if (tag !== undefined && typeof tag !== 'string') errors.tag = 'tag must be a single string';
  if (!['newest', 'oldest'].includes(sort)) errors.sort = 'sort must be "newest" or "oldest"';

  const n = Number(limit);
  if (!Number.isInteger(n) || n < 1 || n > 100) {
    errors.limit = 'limit must be a whole number from 1 to 100';
  }

  if (Object.keys(errors).length) return { errors };
  return {
    data: {
      search: search.trim(),
      tag: tag?.trim().toLowerCase(),
      sort,
      limit: n,
    },
  };
}
