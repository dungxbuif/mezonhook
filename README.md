# MezonHook

MezonHook is a focused browser editor for composing and sending ordered Mezon Channel Webhook messages. The form, preview, raw JSON, generated cURL, generated Bot SDK sample, saved project, and actual delivery all use the same validated message model.

Try the live deployment at [mezonhook.dungxbuif.com](https://mezonhook.dungxbuif.com).

## What it supports

The Channel Webhook editor exposes only fields verified against a real Mezon channel:

- `t`: message text
- `mk`: preformatted and link ranges
- `mentions`: username or user-ID ranges
- `images`: hosted HTTPS image metadata
- `hg`: channel-reference ranges

Bot-only embeds and interactive components are intentionally not mixed into the webhook form. The Advanced section generates a runnable JavaScript Bot SDK sample for the same standard message. See the [live verification matrix](docs/LIVE-VERIFICATION.md) for evidence and limits.

Projects support up to 20 ordered messages and 10 named webhook targets. Projects persist locally and can be imported or exported as JSON. Webhook URLs remain password-masked in memory and are cleared after a successful send; they are never written into local storage or project exports.

## Prerequisites

- Node.js 20, 21, 22, or 23
- npm

Node.js 24 is not currently supported by the Mezon SDK development dependency used by the live bot verifier.

## Run locally

```bash
npm ci
npm test
npm run build --workspace @mezonhook/web
npm run dev --workspace @mezonhook/web
```

Open the local Vite URL. Use **Compose** for the normal workflow, switch to **Preview** on narrow screens, and open **Advanced JSON and code** only when protocol-level inspection is needed.

## Live verification

Dry-run the complete case catalog without credentials:

```bash
npm run verify:live -- --mode=dry-run
```

Credentialed runs are restricted by the script to channel `2096923994367201280`. Bot credentials are read from environment variables; webhook URLs must never be committed or printed. Setup and evidence are documented in [docs/LIVE-VERIFICATION.md](docs/LIVE-VERIFICATION.md).

## Repository layout

```text
apps/web/        Vite + React editor, preview, and generated samples
packages/schema/ Strict Channel Webhook project schema and validation
scripts/         Reproducible live-verification harness
docs/            Usage, evidence, architecture, and deployment notes
```

## Security and browser delivery

The browser posts directly to Mezon. A static host cannot bypass browser CORS enforcement, so delivery requires Mezon to permit the host origin and a working client network connection. Treat this URL as a credential:

```text
https://webhook.mezon.ai/webhooks/{channelId}/{token}
```

Never put a webhook URL or bot token in source, exported JSON, screenshots, issues, logs, or chat. See the [usage guide](docs/USAGE.md), [deployment guide](docs/DEPLOYMENT.md), and [security policy](SECURITY.md).

## License

MIT. See [LICENSE](LICENSE).
