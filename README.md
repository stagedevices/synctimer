# SyncTimer

This project contains a React + TypeScript web app as well as Firebase Cloud Functions.

Before running any `pnpm` commands, install dependencies for each package:

```bash
cd web && pnpm install
cd ../functions && pnpm install
```

If you encounter a Vite error like `Failed to resolve import "yaml"`, double
check that `pnpm install` was run inside the `web` directory so that the browser
build of `yaml` gets installed under `web/node_modules`.

Once dependencies are installed you can lint and build both packages with:

```bash
pnpm lint
pnpm build
```

To verify the web app build and lint checks, run:

```bash
cd web && pnpm lint && pnpm build
```
