# MezonHook MVP Design

## Goal

Build MezonHook, a single-repository web application for composing, previewing, saving, sharing, and sending rich Mezon messages. The first release is a webhook-builder-style composer; the same repository reserves boundaries for a future developer platform without shipping bot provisioning or API-key management prematurely.

## Product scope

The MVP provides a browser-based editor with a live Mezon-like preview. It supports a message body, one rich card (color, title, description, author, thumbnail, image, and up to 25 fields), and up to five buttons. A user can start from one of three common templates: announcement, release note, or event invitation. Drafts persist locally in the browser and can be exported/imported as versioned JSON. It sends a validated draft directly to an official Mezon Channel Webhook URL supplied for the current session.

## Architecture

Use an npm-workspaces monorepo. `apps/web` is a Vite + React + TypeScript application. `packages/schema` contains framework-free message types, defaults, validation, templates, and JSON serialization so a future API app can consume the same contract. `apps/api` is intentionally absent from the first commit: adding an empty service would create a deployment and security surface before its endpoint contract exists.

The preview is an intentional, self-contained adaptation of the public Mezon React client, rather than a Discohook imitation: `mezon/libs/components/.../EmbedMessage/EmbedMessage.tsx` supplies the card structure (520px max width, color rail, author/title/description/fields/thumbnail/image/footer order), `EmbedFields.tsx` supplies its one-to-three-column inline-field grouping, and `MessageActionsPanel`/`MessageButton` supplies action-row and style semantics. MezonHook does not import the Mezon Nx libraries because they depend on the full chat store/runtime; it reproduces only this public rendering contract in its own small components and CSS.

The editor owns a `MessageDraft` value. Form controls dispatch immutable updates; the preview receives only that value. `localStorage` stores a versioned JSON document after every valid change. Import validates before replacing the current draft. A supplied webhook URL lives only in React state. `sendWebhook` posts `{ type: "hook", message: toMezonContent(draft) }` with JSON content type to `https://webhook.mezon.ai/webhooks/{channelId}/{token}`. This keeps the initial application entirely client-side and means webhook tokens never enter browser storage.

## Mezon contract

The draft maps to Mezon interactive content: `t` for body text, an `embed` array containing a rich card, and `components` containing an action row of buttons. Each exported button follows the current Mezon SDK contract: `{ id, type: 1, component: { label, style } }`. The model reflects documented Mezon `InteractiveBuilder` and `ButtonBuilder` fields. The Channel Webhook envelope is documented by Mezon as a JSON `POST` with required `type: "hook"` and `message` fields.

## Error handling and security

Validation limits title, description, fields, buttons, and URL values before export or persistence. The preview renders submitted text as text, never HTML. The send form only accepts the HTTPS `webhook.mezon.ai/webhooks/{channelId}/{token}` URL shape and never writes that URL, bot tokens, or API keys to browser storage. Import and send errors remain local and describe the failed action.

## Testing

Unit tests cover template output, validation, storage serialization, JSON import rejection, webhook request formation, and webhook URL rejection. Component tests cover the editor-to-preview flow, template selection, restore/export/import, and sending feedback. The build and test commands must pass before the initial commit.

## Non-goals

- Authentication, user accounts, shared cloud templates, API keys, analytics, and bot/app provisioning.
- Sending a message through an undocumented Mezon webhook endpoint.
- Reusing Discohook source code or copying its AGPL-3.0 implementation.
