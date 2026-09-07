# Deploying MezonHook

MezonHook is a static Vite/React site. It can be deployed to any static host or served from the included Docker image. It has no server-side API.

## Static host

Build the web workspace from the repository root:

```bash
npm ci
npm run build --workspace @mezonhook/web
```

Publish the generated `apps/web/dist` directory. Configure the host to return `index.html` for unknown application paths so browser navigation continues to work with the single-page app.

## Docker

Build and run the included static-site image:

```bash
docker build -t mezonhook:local .
docker run --rm -p 8080:8080 mezonhook:local
```

Open `http://localhost:8080`. The runtime is an unprivileged nginx Alpine image and serves only the built `apps/web/dist` assets.

The maintained demo is available at [https://mezonhook.dungxbuif.com](https://mezonhook.dungxbuif.com). Its reverse proxy routes HTTPS traffic to the Docker container; deploy a rebuilt image after `npm test` and the web production build succeed.

## Sending to Mezon and CORS

Users configure a Channel Webhook in Mezon, copy its URL, and paste it into MezonHook for the current browser session. The URL has the form `https://webhook.mezon.ai/webhooks/{channelId}/{token}` and is sent directly from the browser to Mezon.

Because the request is client-side, static hosting and Docker cannot bypass browser CORS rules. Mezon must permit the page's origin, and the user must have a network path to Mezon. If sending fails, check the browser console/network panel for CORS or connectivity failures, confirm the URL was copied intact, and make sure the webhook remains valid. Never publish the URL while troubleshooting; rotate it in Mezon if it is exposed.
