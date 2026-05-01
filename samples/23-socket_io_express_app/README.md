# 23-socket_io_express_app

Express sample application using `@xtaskjs/socket-io` with decorated gateways and a browser client.

## Run

```bash
npm install
npm start
```

From this folder: `samples/23-socket_io_express_app`.

## Test URLs

- Demo page:
  - http://127.0.0.1:3000/
- Health endpoint:
  - http://127.0.0.1:3000/health
- Socket status snapshot:
  - http://127.0.0.1:3000/socket/status
- Trigger an HTTP broadcast:
  - http://127.0.0.1:3000/socket/announce/Deploying%20in%205%20minutes

## What It Demonstrates

- `@SocketGateway()` on a regular xtaskjs `@Service()` class.
- Decorated handlers for connect, disconnect, room joins, and chat messages.
- Automatic acknowledgement handling when an event handler returns a value.
- `@InjectSocketService()` from a non-gateway service to broadcast server announcements.
- Automatic server attachment during `app.listen()` and cleanup during `app.close()`.

## Notes

- Uses the Express adapter so the sample can serve the HTML, CSS, and browser client script from the same origin.
- The browser client connects to the `/chat` namespace and joins the default `lobby` room automatically.
## Manifest Cache

- On first startup, xtaskjs performs a filesystem scan and creates `.xtask-manifest.json`.
- On subsequent startups, xtaskjs loads this manifest directly to speed up boot time.
- Delete `.xtask-manifest.json` to force a full rescan.
- This file is ignored in `.gitignore` for each sample.
## Parallel Load Configuration

- xtaskjs scans autoload candidates in parallel using worker threads.
- By default, it uses all available CPU parallelism.
- Use `npm run start:parallel` in this sample to run with explicit parallel configuration (`XTASK_SCAN_WORKERS=auto`).
- Optional: set `XTASK_SCAN_WORKERS=1` to force single-worker mode for debugging.
