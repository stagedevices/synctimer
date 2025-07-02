# SyncTimer

This project contains a React + TypeScript web app as well as Firebase Cloud Functions.

This repository now uses a `pnpm-workspace.yaml` so running `pnpm install` from
the repository root will install dependencies for both the `web` and
`functions` packages.

If you encounter a Vite error like `Failed to resolve import "yaml"`, ensure
that dependencies were installed via `pnpm install` from the repository root so
the browser build of `yaml` is present under `web/node_modules`.

Once dependencies are installed you can lint and build both packages with:

```bash
pnpm lint
pnpm build
```

To verify the web app build and lint checks, run:

```bash
cd web && pnpm lint && pnpm build
```
