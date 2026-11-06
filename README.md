# Notes REST API

Assignment 6: a RESTful API for **notes**, built with Node.js, Express and MongoDB (Mongoose).
Users sign up and log in to get a JWT. Every note belongs to one user, and nobody else can
read, change or delete it.

- Full CRUD on one resource: list, get one, create, replace (PUT), update (PATCH), delete
- RESTful routes and correct status codes (`200 201 204 400 401 404 409 500`)
- Data persists in MongoDB (Atlas or local); nothing is kept in memory
- Input validation on create and update, with JSON error messages
- Passwords hashed with bcrypt; routes protected with JWT (`Authorization: Bearer <token>`)
- Malformed JSON, bad ids and missing records return JSON errors; the server keeps running
- A Postman collection (46 requests with tests) plus a saved test run in [`postman/`](postman/)

## Tech stack

| Part | Choice |
|---|---|
| Runtime | Node.js 20+ (ES modules) |
| Framework | Express 5 |
| Database | MongoDB with Mongoose 9 |
| Auth | bcrypt (password hashing), jsonwebtoken (JWT) |
| Config | dotenv (`.env`), cors |

## Getting started

### 1. Prerequisites

- Node.js 20 or newer (`node -v`)
- A MongoDB database. Either:
  - **MongoDB Atlas (free):** create a cluster, add a database user, allow your IP under
    *Network Access*, then copy the connection string from *Connect → Drivers*; or
  - a local MongoDB server: `mongodb://127.0.0.1:27017/notes-api`

### 2. Install dependencies

```bash
git clone <this-repo-url> notes-rest-api
cd notes-rest-api
npm install
```

### 3. Configure environment variables

Copy the example file and fill in real values:

```bash
cp .env.example .env        # Windows PowerShell: Copy-Item .env.example .env
```

| Variable | Required | Description |
|---|---|---|
| `MONGODB_URI` | yes | MongoDB connection string. Put the database name after the host, e.g. `...mongodb.net/notes-api?retryWrites=true&w=majority` |
| `JWT_SECRET` | yes | Long random string used to sign tokens. Generate one with `node -p "crypto.randomBytes(32).toString('hex')"` |
| `PORT` | no | Port to listen on (default `3000`) |
| `JWT_EXPIRES_IN` | no | Token lifetime (default `1h`) |
| `CLIENT_ORIGIN` | no | Front-end origin allowed by CORS, e.g. `http://localhost:5173`. If unset, any origin is allowed (dev only) |

`.env` is listed in `.gitignore` and is never committed. Only `.env.example` (fake values) is.

### 4. Run the dev server

```bash
npm run dev
```

You should see:

```
Connected to MongoDB
API listening on :3000
```

`npm run dev` restarts on file changes (`node --watch`). Use `npm start` to run without watching.
Check it is up: `curl http://localhost:3000/api/health` → `{"status":"ok","db":"connected"}`.

| Script | What it does |
|---|---|
| `npm run dev` | Start the API and restart on file changes |
| `npm start` | Start the API |
| `npm run test:api` | Run the whole Postman collection from the terminal with Newman (server must be running) |

## Project structure

```
notes-rest-api/
├── server.js                  # app setup: dotenv, cors, json, routes, errors; connect then listen
├── auth/token.js              # signToken / verifyToken (JWT)
├── middleware/
│   ├── requireAuth.js         # 401 unless "Authorization: Bearer <valid token>"; sets req.userId
│   ├── validateObjectId.js    # 400 for ids that are not valid ObjectIds
│   └── errors.js              # JSON 404 for unknown routes + central error handler
├── models/
│   ├── User.js                # email (unique), passwordHash
│   └── Note.js                # title, body, tags, userId (ref User), timestamps
├── routes/
│   ├── auth.js                # POST /api/auth/signup, POST /api/auth/login
│   └── notes.js               # the six /api/notes routes
├── validation/
│   ├── auth.js                # email + password rules
│   └── notes.js               # note body rules (POST/PUT, PATCH) and list query rules
├── postman/
│   ├── notes-api.postman_collection.json
│   └── test-results/          # saved Newman run (test evidence)
├── .env.example
└── README.md
```

## Data model

**User** (`users` collection)

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | set by MongoDB |
| `email` | String | required, unique, stored lower-case and trimmed |
| `passwordHash` | String | bcrypt hash (cost 12). The plain password is never stored or returned |
| `createdAt`, `updatedAt` | Date | set automatically |

**Note** (`notes` collection)

| Field | Type | Rules |
|---|---|---|
| `_id` | ObjectId | set by MongoDB |
| `title` | String | **required**, trimmed, 1–120 characters |
| `body` | String | optional, default `""`, up to 10,000 characters |
| `tags` | [String] | optional, default `[]`, up to 10 tags of 1–30 characters; stored trimmed, lower-case, without duplicates |
| `userId` | ObjectId → User | the owner, **always taken from the token**, never from the request body |
| `createdAt`, `updatedAt` | Date | set automatically |

## Authentication

1. `POST /api/auth/signup` or `POST /api/auth/login` returns a `token`.
2. Send it on every `/api/notes` request:

```
Authorization: Bearer <token>
```

Tokens expire after 1 hour (`JWT_EXPIRES_IN`). After that, log in again.

- No token, a wrong scheme, or a bad/expired token → `401`
- A note that belongs to someone else → `404 Note not found` (the API does not reveal that it exists)

## API reference

Base URL: `http://localhost:3000`

| Method | Path | Auth | Description | Success | Errors |
|---|---|---|---|---|---|
| GET | `/api/health` | – | Health check | 200 | – |
| POST | `/api/auth/signup` | – | Create an account, get a token | 201 | 400, 409 |
| POST | `/api/auth/login` | – | Log in, get a token | 200 | 400, 401 |
| GET | `/api/notes` | Bearer | List my notes (`?search` `?tag` `?sort` `?limit`) | 200 | 400, 401 |
| GET | `/api/notes/:id` | Bearer | Get one note | 200 | 400, 401, 404 |
| POST | `/api/notes` | Bearer | Create a note | 201 | 400, 401 |
| PUT | `/api/notes/:id` | Bearer | Replace a note (missing fields reset to defaults) | 200 | 400, 401, 404 |
| PATCH | `/api/notes/:id` | Bearer | Update only the fields sent | 200 | 400, 401, 404 |
| DELETE | `/api/notes/:id` | Bearer | Delete a note | 204 (no body) | 400, 401, 404 |

Any server error returns `500` with `{ "error": "Internal server error" }`.

---

### `GET /api/health`

```json
// 200 OK
{ "status": "ok", "db": "connected" }
```

### `POST /api/auth/signup`

Request body — `email` must look like an email, `password` must be 8–72 characters:

```json
{ "email": "alice@uni.edu", "password": "hunter22" }
```

```json
// 201 Created
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2NzJhMWYw...",
  "user": { "id": "672a1f0c9b1e4a6d2c3f8a01", "email": "alice@uni.edu" }
}
```

```json
// 400 Bad Request — e.g. body {"password":"short"}
{
  "error": "Validation failed",
  "details": {
    "email": "Email is required",
    "password": "Password must be at least 8 characters"
  }
}
```

```json
// 409 Conflict
{ "error": "Email already registered" }
```

### `POST /api/auth/login`

```json
{ "email": "alice@uni.edu", "password": "hunter22" }
```

```json
// 200 OK
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { "id": "672a1f0c9b1e4a6d2c3f8a01", "email": "alice@uni.edu" }
}
```

```json
// 401 Unauthorized — same message for an unknown email and a wrong password
{ "error": "Invalid email or password" }
```

### `GET /api/notes`

Returns only the logged-in user's notes. Optional query parameters:

| Param | Default | Meaning |
|---|---|---|
| `search` | – | Case-insensitive text search in `title` and `body` |
| `tag` | – | Only notes with this tag |
| `sort` | `newest` | `newest` or `oldest` (by `createdAt`) |
| `limit` | `20` | Whole number from 1 to 100 |

Example: `GET /api/notes?search=exam&tag=week9&sort=newest&limit=10`

```json
// 200 OK
[
  {
    "_id": "672a1f2a9b1e4a6d2c3f8a07",
    "title": "Exam topics",
    "body": "REST, status codes, bcrypt, JWT",
    "tags": ["exam", "week9"],
    "userId": "672a1f0c9b1e4a6d2c3f8a01",
    "createdAt": "2026-11-05T18:30:02.114Z",
    "updatedAt": "2026-11-05T18:30:02.114Z"
  }
]
```

```json
// 400 Bad Request — e.g. ?sort=random&limit=0
{
  "error": "Validation failed",
  "details": {
    "sort": "sort must be \"newest\" or \"oldest\"",
    "limit": "limit must be a whole number from 1 to 100"
  }
}
```

### `GET /api/notes/:id`

```json
// 200 OK
{
  "_id": "672a1f2a9b1e4a6d2c3f8a07",
  "title": "Exam topics",
  "body": "REST, status codes, bcrypt, JWT",
  "tags": ["exam", "week9"],
  "userId": "672a1f0c9b1e4a6d2c3f8a01",
  "createdAt": "2026-11-05T18:30:02.114Z",
  "updatedAt": "2026-11-05T18:30:02.114Z"
}
```

```json
// 400 Bad Request — id is not a valid ObjectId, e.g. /api/notes/abc
{ "error": "Invalid note id" }
```

```json
// 404 Not Found — no such note, or it belongs to another user
{ "error": "Note not found" }
```

### `POST /api/notes`

Request body — only `title` is required. Any `userId` in the body is ignored.

```json
{ "title": "Exam topics", "body": "REST, status codes, bcrypt, JWT", "tags": ["Exam", " week9 "] }
```

```json
// 201 Created — tags were trimmed and lower-cased; userId comes from the token
{
  "title": "Exam topics",
  "body": "REST, status codes, bcrypt, JWT",
  "tags": ["exam", "week9"],
  "userId": "672a1f0c9b1e4a6d2c3f8a01",
  "_id": "672a1f2a9b1e4a6d2c3f8a07",
  "createdAt": "2026-11-05T18:30:02.114Z",
  "updatedAt": "2026-11-05T18:30:02.114Z"
}
```

```json
// 400 Bad Request — e.g. {"title": "  ", "body": 42, "tags": "exam"}
{
  "error": "Validation failed",
  "details": {
    "title": "title is required and must be a non-empty string",
    "body": "body must be a string",
    "tags": "tags must be an array of strings"
  }
}
```

```json
// 400 Bad Request — body is not valid JSON, e.g. { "title": "Broken", }
{ "error": "Malformed JSON in request body" }
```

### `PUT /api/notes/:id` — replace

Sends the whole note. `title` is required; a missing `body` or `tags` is reset to `""` / `[]`.

```json
{ "title": "Exam topics v2", "body": "REST, auth, JWT, CORS", "tags": ["exam"] }
```

```json
// 200 OK — the new version
{
  "_id": "672a1f2a9b1e4a6d2c3f8a07",
  "title": "Exam topics v2",
  "body": "REST, auth, JWT, CORS",
  "tags": ["exam"],
  "userId": "672a1f0c9b1e4a6d2c3f8a01",
  "createdAt": "2026-11-05T18:30:02.114Z",
  "updatedAt": "2026-11-05T18:31:40.508Z"
}
```

Errors: `400` (invalid id or validation failed, e.g. no `title`), `404` (not found / not yours).

### `PATCH /api/notes/:id` — partial update

Send only the fields to change (at least one of `title`, `body`, `tags`). Other fields keep their values.

```json
{ "title": "Final exam topics" }
```

```json
// 200 OK — title changed, body and tags kept
{
  "_id": "672a1f2a9b1e4a6d2c3f8a07",
  "title": "Final exam topics",
  "body": "REST, auth, JWT, CORS",
  "tags": ["exam"],
  "userId": "672a1f0c9b1e4a6d2c3f8a01",
  "createdAt": "2026-11-05T18:30:02.114Z",
  "updatedAt": "2026-11-05T18:32:15.977Z"
}
```

```json
// 400 Bad Request — empty body {}
{
  "error": "Validation failed",
  "details": { "body": "Send at least one of: title, body, tags" }
}
```

Errors: `400` (invalid id or validation failed), `404` (not found / not yours).

### `DELETE /api/notes/:id`

```
204 No Content   (empty body)
```

```json
// 404 Not Found — already deleted, never existed, or not yours
{ "error": "Note not found" }
```

## Errors

Every error is JSON with an `error` message; validation errors add `details` per field.

| Status | When |
|---|---|
| `400 Bad Request` | Validation failed, malformed JSON, invalid note id, bad query parameter |
| `401 Unauthorized` | Missing/invalid/expired token, or wrong email/password at login |
| `404 Not Found` | Note doesn't exist or belongs to another user; unknown route |
| `409 Conflict` | Signing up with an email that is already registered |
| `413 Payload Too Large` | Request body over 100 kb |
| `500 Internal Server Error` | Unexpected error (logged on the server; details hidden when `NODE_ENV=production`) |

## Testing

### Postman / Thunder Client

1. Start the server (`npm run dev`).
2. Import [`postman/notes-api.postman_collection.json`](postman/notes-api.postman_collection.json)
   into Postman (or Thunder Client → Collections → Import).
3. Run the whole collection in order (Postman: *Run collection*).

The collection signs up two users (Alice and Bob) with unique emails each run, stores their tokens and
the created note id in collection variables, and checks every route with tests:

| Folder | What it checks |
|---|---|
| 0 · Health | server and database are up |
| 1 · Auth | signup 201, duplicate email 409, bad input 400, malformed JSON 400, login 200, wrong password / unknown email 401 with the same message, NoSQL-injection attempt 400 |
| 2 · Notes CRUD | 401 without/with a bad token, create 201 (+ defaults, + validation 400s), list with `search`/`tag`/`sort`/`limit`, get one 200/400/404, PUT replace, PATCH partial update, 400s and 404s |
| 3 · Authorization | Bob gets 404 when reading, replacing, patching or deleting Alice's note; Alice's note is unchanged |
| 4 · Delete | delete 204, then 404 on get and on a second delete, 400 for a bad id |
| 5 · Unknown routes | JSON 404 |

If your server is not on port 3000, change the `baseUrl` collection variable.

### From the terminal (Newman)

With the server running:

```bash
npm run test:api
```

### Test evidence

[`postman/test-results/`](postman/test-results/) holds a saved run of the full collection against a real
MongoDB database — **46 requests, 111 assertions, 0 failures**:

- `newman-run.txt` — the console output: every request, its status code and each test result
- `newman-junit.xml` — the same results in JUnit format

## curl examples

Bash / Git Bash syntax. Replace `TOKEN` and `NOTE_ID` with real values.

```bash
# 1. no token -> 401 {"error":"Missing token"}
curl -i http://localhost:3000/api/notes

# 2. sign up and log in -> {"token":"eyJ...","user":{...}}
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@uni.edu","password":"hunter22"}'

curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@uni.edu","password":"hunter22"}'

# 3. create -> 201
curl -X POST http://localhost:3000/api/notes \
  -H "Authorization: Bearer TOKEN" -H "Content-Type: application/json" \
  -d '{"title":"Exam topics","body":"REST, JWT","tags":["exam"]}'

# 4. list (with optional query) and get one -> 200
curl "http://localhost:3000/api/notes?search=exam&sort=newest&limit=10" -H "Authorization: Bearer TOKEN"
curl http://localhost:3000/api/notes/NOTE_ID -H "Authorization: Bearer TOKEN"

# 5. replace (PUT) and partial update (PATCH) -> 200
curl -X PUT http://localhost:3000/api/notes/NOTE_ID \
  -H "Authorization: Bearer TOKEN" -H "Content-Type: application/json" \
  -d '{"title":"Exam topics v2","body":"REST, auth, JWT, CORS","tags":["exam"]}'

curl -X PATCH http://localhost:3000/api/notes/NOTE_ID \
  -H "Authorization: Bearer TOKEN" -H "Content-Type: application/json" \
  -d '{"title":"Final exam topics"}'

# 6. delete -> 204, then again -> 404
curl -i -X DELETE http://localhost:3000/api/notes/NOTE_ID -H "Authorization: Bearer TOKEN"
curl -i -X DELETE http://localhost:3000/api/notes/NOTE_ID -H "Authorization: Bearer TOKEN"
```

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `Missing MONGODB_URI or JWT_SECRET` on start | `.env` is missing or incomplete — copy `.env.example` to `.env` and fill it in |
| `DB connection failed: ... timed out` | Your IP isn't allowed in Atlas → *Network Access* → add your current IP |
| `DB connection failed: bad auth` | Wrong database user or password in `MONGODB_URI` (URL-encode special characters in the password) |
| Always `401` | The header must be exactly `Authorization: Bearer <token>`; tokens expire after 1 hour — log in again |
| Browser shows a CORS error | Set `CLIENT_ORIGIN` to the front end's exact origin (no trailing `/`) and restart |
