# SyncTimer

This project contains a React + TypeScript web app as well as Firebase Cloud Functions.

Before running any `pnpm` commands, install dependencies for each package:

```bash
cd web && pnpm install
cd ../functions && pnpm install
```

Once dependencies are installed you can lint and build both packages with:

```bash
pnpm lint
pnpm build
```

> **Note:** We removed the `"storage"/"cors"` settings from `firebase.json`.
> To set CORS on your production bucket, run:
> ```bash
> cat > cors.json <<EOF
> [
>   {
>     "origin": ["*"],
>     "method": ["GET","POST","PUT"],
>     "maxAgeSeconds": 3600
>   }
> ]
> EOF
> gsutil cors set cors.json gs://synctimer-dev-464400.appspot.com
> ```
