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