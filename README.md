# MezonHook

MezonHook is a browser-based editor for drafting and previewing rich Mezon Channel Webhook messages. It is a static Vite/React application; it does not provide a hosted service, server API, or dashboard.

Start from one of three built-in templates—Announcement, Release note, or Event invitation—then edit the message body, embed-style card, fields, and actions. The preview follows the public Mezon message and interactive-component sources: [Message](https://github.com/mezonai/mezon-js/blob/master/packages/mezon-sdk/src/mezon-client/structures/Message.ts), [interactive-message guide](https://docs.mezon.ai/developer/mezon-topics/interactive-message), and [Channel Webhook guide](https://docs.mezon.ai/developer/webhooks/channel-webhook).

Drafts are saved locally in the browser under a versioned key and can be exported to or imported from JSON. MezonHook can send a draft directly to a Mezon Channel Webhook at:

```
https://webhook.mezon.ai/webhooks/{channelId}/{token}
```

Webhook URLs are treated as credentials: MezonHook keeps them only in session memory. They are never included in local drafts or JSON exports.

## Prerequisites

- Node.js 20 or later
- npm

## Run locally

```bash
npm ci
npm test
npm run build --workspace @mezonhook/web
npm run dev --workspace @mezonhook/web
```

The web application is in `apps/web`; run the last command from the repository root and open the local Vite address it prints.

## Repository layout

```
apps/web/        Vite + React editor and preview
packages/schema/ Shared draft validation and Mezon payload conversion
docs/            User and deployment documentation
```

## Security and browser delivery

The browser sends the webhook request directly to Mezon. A static host cannot bypass browser CORS enforcement: delivery requires Mezon to permit the host origin and a working client network connection. Do not put a webhook URL in source code, environment files, exported JSON, screenshots, tests, issues, or logs. See [the usage guide](docs/USAGE.md), [deployment guide](docs/DEPLOYMENT.md), and [security policy](SECURITY.md).

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.

## License

MIT. See [LICENSE](LICENSE).
