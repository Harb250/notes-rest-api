import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET;
const EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '1h';

// Sign once at signup/login. The payload is readable by anyone, so it only
// holds the user id (sub) and the expiry — never secrets.
export function signToken(user) {
  return jwt.sign({ sub: user._id.toString() }, SECRET, {
    expiresIn: EXPIRES_IN,
  });
}

// Verify on every request. Throws if the token was tampered with or expired,
// so callers must always wrap it in try/catch.
export function verifyToken(token) {
  return jwt.verify(token, SECRET, { algorithms: ['HS256'] });
}
