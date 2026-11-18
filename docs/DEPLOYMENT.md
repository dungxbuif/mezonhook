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

The maintained demo is available at [https://mezonhook.dungxbuif.com](https://mezonhook.dungxbuif.com). Its reverse proxy routes HTTPS traffic to the Docker container. The health probe requests `GET /` on port 8080.

## Homelab CI/CD

Branch and merge request pipelines build the `linux/amd64` Docker image and
start it without network access. The HTTP smoke check requests
`http://127.0.0.1:8080/` inside the container. The Docker build runs TypeScript
checking and compiles the Vite site.

For a production release, the owner creates one protected `prod-<semver>`
tag on the current GitLab `main`. The pipeline checks that the tagged commit
is reachable from `main` and uses the `ci-build` runner for the image build
and smoke check. It publishes the image to the lab registry, then records the
immutable digest in the MezonHook production manifest and stack catalog on
`homelab-ops/main`. The promotion creates the internal
`mezonhook-prod-<semver>` receipt tag for the ops pipeline.

The protected VM100 runner validates the receipt, updates the `mezonhook`
Swarm service with rollback on failure, and checks
`https://mezonhook.dungxbuif.com/`. The app uses `/` for both readiness and
liveness, serves static assets, and requires no database migration or runtime
environment variables.

The source build uses `LAB_REGISTRY_HOST`, `LAB_REGISTRY_PUSH_USER`, and
`LAB_REGISTRY_PUSH_PASSWORD`. Promotion uses `HOMELAB_OPS_PUSH_USER` and
`HOMELAB_OPS_PUSH_TOKEN`. Before tagging, confirm runner assignment, the
protected tag patterns `prod-*` and `*-prod-*`, and that the promotion token
is masked and protected.

Verify a change to this flow by building the image for `linux/amd64`,
starting it with `--network none`, checking the root document and a generated
asset, and checking the CI rules and the promotion script syntax.

## Sending to Mezon and CORS

Users configure a Channel Webhook in Mezon, copy its URL, and paste it into MezonHook for the current browser session. The URL has the form `https://webhook.mezon.ai/webhooks/{channelId}/{token}` and is sent directly from the browser to Mezon.

Because the request is client-side, static hosting and Docker cannot bypass browser CORS rules. Mezon must permit the page's origin, and the user must have a network path to Mezon. If sending fails, check the browser console/network panel for CORS or connectivity failures, confirm the URL was copied intact, and make sure the webhook remains valid. Never publish the URL while troubleshooting; rotate it in Mezon if it is exposed.
