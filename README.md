# CPS714 Library Management System

A library management system project for CPS714. The current application is a responsive React demo for library staff, with overview, catalog, members, and loans views.

## Project Status

This repository currently contains a frontend prototype. Its sample records are static, and sign-in is a demo interaction only; there is no authentication service, database, or API integration yet.

## Getting Started

Requirements: Node.js 22 or later and npm.

```sh
npm ci
npm run dev
```

Vite prints the local development URL in the terminal.

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
