# Contributing

Thanks for contributing to the CPS714 Library Management System. Keep changes focused and discuss larger changes with the team before starting implementation.

## Workflow

1. Pull the latest `main` branch and create a short-lived branch, for example `feature/member-search` or `fix/mobile-navigation`.
2. Install dependencies with `npm ci` and run the app with `npm run dev`.
3. Before pushing, run `npm run lint` and `npm run build`.
4. Push your branch and open a pull request targeting `main`. Describe the change, link related issues, and include screenshots for visible UI changes.
5. Address review feedback and wait for the required checks and an approving review before merging.

Avoid committing generated output, dependency folders, local environment files, or unrelated changes. Do not commit secrets; use `.env.example` to document any required environment variable names without real values.

## Commit Messages

Use a concise imperative summary, such as `Add catalog filtering` or `Fix mobile navigation`. Keep each commit focused on one logical change.