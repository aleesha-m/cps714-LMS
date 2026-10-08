# CPS714 Library Management System

A library management system project for CPS714. The application includes a React library dashboard, separate librarian and member sign-in flows, and an Express/MongoDB API.

## Project Status

Sign-in uses MongoDB-backed sessions and bcrypt-hashed passwords. The dashboard's library records are still sample frontend data; its management API routes are protected for librarians.

## Getting Started

Requirements: Node.js 22.12 or later, npm, and a MongoDB database.

```sh
cp .env.example .env
npm ci
```

Set `MONGO_URI` and a long random `SESSION_SECRET` in `.env`. To create the initial librarian login, set `ACCOUNT_ROLE=librarian`, `ACCOUNT_ID`, `ACCOUNT_NAME`, `ACCOUNT_EMAIL`, and `ACCOUNT_PASSWORD`, then run:

```sh
npm run account:setup
```

Remove `ACCOUNT_PASSWORD` from `.env` after account setup. To enable a member login, the member must already exist in MongoDB; set `ACCOUNT_ROLE=member`, `ACCOUNT_ID` to their member ID, and `ACCOUNT_EMAIL` to the email on that record, then run the same setup command. Member credentials can also be assigned when a librarian creates a member through the API.

Start both the Vite frontend and API during development with:

```sh
npm run dev
```

Vite prints the local development URL in the terminal. The frontend proxies `/api` requests to the Express server on port 5001.

## Quality Checks

Run these before opening a pull request:

```sh
npm run lint
npm run build
```

GitHub Actions runs both checks for pushes to `main` and pull requests targeting `main`.

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) before making a change. Use a short-lived branch and submit changes through a pull request so teammates can review them.

## Tech Stack

- React 19 and TypeScript
- Vite
- Oxlint
- lucide-react icons
