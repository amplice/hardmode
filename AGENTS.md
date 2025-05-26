# AGENTS Guide

This repository is an experiment in building a lightweight 2D MMORPG using **PixiJS** and a Node.js back end. Almost all of the code was generated with the help of large language models. The project owner is not a professional developer and tends to experiment through trial and error.

AI agents working on this codebase should keep the following in mind:

## Running the project

1. Install dependencies once with `npm install` (Node 18+ recommended).
2. Launch the development server with `npm run dev`. This uses Vite to serve the `src` directory.
3. There are currently **no automated tests**. The `npm test` script only prints an error.

## Code style

- JavaScript source lives in `src/js`.
- Use ES module syntax for imports/exports.
- Indent with **4 spaces** and end statements with semicolons.
- Prefer single quotes for strings.
- Keep code readable and add comments where logic is unclear.

## Repository layout

- `src/index.html` – main HTML entry point.
- `src/js/` – game logic modules (entities, systems, UI, etc.).
- `src/assets/` – sprites and other binary assets. These files are large; avoid changing them unless necessary.
- Design documents (`Game Design Document.txt`, `Development Roadmap.txt`, `Technical Architecture Document.txt`, etc.) give high level context on the intended game.

## Additional notes

- Because the project evolved organically, naming and organization may be inconsistent. Feel free to refactor, but keep commits small and well explained.
- When adding features, check the design documents for guidance, but don’t worry about perfect adherence—they are aspirational.
- Provide helpful commit messages so future AI (and the owner) can follow the changes.

