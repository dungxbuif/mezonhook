# MezonHook

MezonHook is a browser composer with two intentionally separate modes: **Channel Webhook** for direct delivery and **Bot SDK** for generating a complete authenticated JavaScript sender. Each mode keeps its own draft and uses one validated model for its form, preview, JSON/code, storage, and export.

Try the live deployment at [mezonhook.dungxbuif.com](https://mezonhook.dungxbuif.com).

## Two composer modes

- **Channel Webhook (v3)** — compose ordered text messages with formatting, mentions, images, and channel references; inspect JSON/cURL; then send to named webhook targets.
- **Bot SDK (v2)** — compose ordered messages with embeds, fields, buttons, inputs, selects, radio choices, date pickers, and animation payloads; then copy the generated JavaScript. Interactive controls still need event handlers in your bot process.

The mode tabs are at the start of the workspace. Switching modes does not discard either draft. Imports route by project version and switch to the matching mode; exports contain only the active mode.

## Channel Webhook support

The Channel Webhook editor exposes only fields verified against a real Mezon channel:

- `t`: message text
- `mk`: preformatted and link ranges
- `mentions`: username or user-ID ranges
- `images`: hosted HTTPS image metadata
- `hg`: channel-reference ranges

Bot-only embeds and interactive components are intentionally not mixed into the webhook form. See the [live verification matrix](docs/LIVE-VERIFICATION.md) for evidence and limits.

Projects support up to 20 ordered messages and 10 named webhook targets. Projects persist locally and can be imported or exported as JSON. Webhook URLs remain password-masked in memory and are cleared after a successful send; they are never written into local storage or project exports.

A fresh webhook project opens with a meaningful rich demo containing preformatted text, a link, an illustrative bot mention, an illustrative channel reference, and a hosted image. It is editable and is never sent automatically. The mention/channel IDs are examples and must be replaced before delivery. Existing saved and imported projects retain their own content and target names.

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

Open the local Vite URL. The preview is shown inside a scoped Mezon-like conversation surface so text ranges, mentions, channel references, code, links, embeds, components, and images have realistic visual context. On desktop, a preview that fits stays visible below the sticky header; a very long preview follows normal page flow instead of creating a second scrollbar. On narrow screens, use **Compose** and **Preview**. Open advanced JSON/code only when protocol-level inspection is needed.

Bot code reads `MEZON_BOT_ID`, `MEZON_BOT_TOKEN`, and `MEZON_CHANNEL_ID` from the environment. If browser clipboard access is blocked, the app reports the failure and asks you to select and copy the visible sample manually; it never reports a false success.

## Live verification

Dry-run the complete case catalog without credentials:

```bash
npm run verify:live -- --mode=dry-run
```

Credentialed runs are restricted by the script to channel `2096923994367201280`. Bot credentials are read from environment variables; webhook URLs must never be committed or printed. Setup and evidence are documented in [docs/LIVE-VERIFICATION.md](docs/LIVE-VERIFICATION.md).

## Repository layout

```text
apps/web/        Vite + React dual-mode editor, previews, and generated samples
packages/schema/ Strict v2 Bot and v3 Channel Webhook schemas and validation
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
