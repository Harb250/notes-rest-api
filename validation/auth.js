const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PASSWORD_MIN = 8;
// bcrypt only looks at the first 72 bytes of a password, so reject longer
// ones instead of silently ignoring the rest.
export const PASSWORD_MAX_BYTES = 72;

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

// Checks types as well as values: an email of {"$gt": ""} must never reach a
// MongoDB query (NoSQL injection).
export function validateCredentials(body, { checkStrength = true } = {}) {
  if (!isPlainObject(body)) {
    return { errors: { body: 'Request body must be a JSON object' } };
  }
  const { email, password } = body;
  const errors = {};

  if (typeof email !== 'string' || email.trim() === '') {
    errors.email = 'Email is required';
  } else if (!EMAIL.test(email.trim())) {
    errors.email = 'Email must be a valid email address';
  }

  if (typeof password !== 'string' || password === '') {
    errors.password = 'Password is required';
  } else if (checkStrength && password.length < PASSWORD_MIN) {
    errors.password = `Password must be at least ${PASSWORD_MIN} characters`;
  } else if (checkStrength && Buffer.byteLength(password) > PASSWORD_MAX_BYTES) {
    errors.password = `Password must be at most ${PASSWORD_MAX_BYTES} bytes`;
  }

  if (Object.keys(errors).length) return { errors };
  return { data: { email: email.trim().toLowerCase(), password } };
}
