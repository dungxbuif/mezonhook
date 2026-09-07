# MezonHook Project Builder Design

## Goal

Turn the single-message Mezon webhook composer into a local-first project builder modeled on Discohook's `messages[]` plus `targets[]` workflow. A user can build a sequence of Mezon messages, preview the complete sequence, select one or more webhook targets, save/import/export the project, and find in-product setup help.

## Scope

### Project model

`WebhookProject` contains a version, project name, an ordered non-empty `messages: MessageDraft[]`, and `targets: WebhookTarget[]`. A target has an id and display name only in persisted/exported data. The secret webhook URL is never persisted, exported, or copied into a message. Browser-session target URLs are held separately in UI state.

The schema exposes constructors, strict normalizers, validators, project import/export, and `toMezonContent`. Incoming JSON is whitelisted at every nested level, preserving the existing secret-stripping property.

### Builder and preview

The UI has a compact product header with Builder, Help, and Config navigation. Builder has a message rail: add, duplicate, remove, select, and move messages. The current message uses the existing rich-card editor. Preview renders every message in order, while clearly marking the selected message. Empty/invalid edits stay in the editor but cannot be sent.

### Config and delivery

Config manages named target slots. Each URL field is password-masked and browser-session-only. Sending validates the selected messages and every chosen URL; it delivers messages in order to every chosen target, reports a count, clears URL secrets only after all deliveries succeed, and never includes a URL in an error. No account, backend, remote share link, API-key feature, or cloud persistence is part of this phase.

### Help

Help is an in-app panel explaining how to create/copy a Mezon channel webhook, use message sequencing, use targets and session-only secrets, import/export project JSON, and recover from a failed send. It links to the official Mezon Vietnamese documentation.

## Architecture

`packages/schema` owns pure project types, creation, normalization, validation, and Mezon payload conversion. `apps/web/src/project-storage.ts` owns localStorage and JSON import/export without secrets. `apps/web/src/webhook.ts` owns URL validation and sequential batch delivery. `App.tsx` owns transient selected IDs, session URL map, and screen state; presentational components may be extracted when that makes the message editor or preview independently understandable.

## Safety and compatibility

- Existing individual `MessageDraft`, templates, and documented Mezon POST envelope continue to work.
- Existing `mezonhook:draft:v1` data migrates once into a one-message project; all future data uses `mezonhook:project:v2`.
- A project must have 1–20 messages and 1–10 target slots. A send must select at least one target with a valid URL.
- The client must never save/export a webhook URL and must continue to enforce `https://webhook.mezon.ai/webhooks/{channelId}/{token}`.
- No third-party source code or Discord-only protocol is copied; Discohook informs the interaction model only.

## Verification

Automated tests cover strict project normalization, v1 migration, import/export secret stripping, message lifecycle operations, ordered batch delivery, URL validation, and navigation/help content. The full workspace test suite and production web build must pass. Docker image is rebuilt and the deployed container is recreated only after those checks pass.
