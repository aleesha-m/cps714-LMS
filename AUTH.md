# Authentication

Sign up / log in with two roles. No new npm packages are needed (passwords use Node's built-in scrypt; sessions live in MongoDB).

## Setup
1. Add `LIBRARIAN_CODE=<something long and random>` to your `.env` (see `.env.example`).
2. Start the API (`node server/server.js` or your nodemon command) and the frontend (`npm run dev`).
3. Open the Vite URL. Vite proxies `/api` to `http://localhost:5001`, so keep the API on port 5001.
4. Sign up as a librarian first (using the invite code), then members can sign up themselves.

## Roles
| Action | Member | Librarian |
|---|:--:|:--:|
| View catalog (GET /api/books) | yes | yes |
| Check out a book (POST /api/loans) | yes (for themselves) | yes (can pass `user_id`, `due_date`) |
| Check in (PUT /api/loans/:id/return) | own loans only | any loan |
| View loans (GET /api/loans) | own only | all |
| Add books (POST /api/books) | no | yes |
| View/add members and librarians | no | yes |

## Endpoints
`POST /api/auth/signup`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`

## Changed behaviour
- All existing routes now require a signed-in session (401 otherwise) and enforce roles (403).
- `POST /api/loans` now generates `loan_id` and a 14-day `due_date` itself; send only `{ "ISBN": "..." }`.
- Signing up creates the matching `Member` / `Librarian` document automatically.
