# Reliable Composer and Live Verification Design

## Intent

MezonHook must let a user compose, inspect, copy, and deliver the same message without hidden parallel state. The page is a compact developer tool: the common path is compose → preview → deliver, while raw JSON, generated code, and protocol detail are progressively disclosed.

## Goals

- Use one `ChannelWebhookMessage` model for the visual form, preview, raw envelope, persisted project, generated samples, and network delivery.
- Support the documented Channel Webhook fields `t`, `mk`, `mentions`, `images`, and `hg`, with field-level validation including ranges inside `t`.
- Deliver every project message in order to every selected webhook target.
- Generate runnable cURL and JavaScript Bot SDK samples from the inspected message.
- Verify the generated JavaScript sample with an authenticated bot against the configured test channel.
- Publish a reproducible support matrix distinguishing documented, validation-tested, webhook-live-tested, and bot-live-tested behavior.
- Reduce the primary UI to message composition and preview; move JSON, code, targets, help, and appearance into clearly labeled secondary sections.

## Non-goals

- MezonHook will not collect, persist, or execute bot credentials in the browser.
- The webhook editor will not present bot-only `embed` or `components` as webhook capabilities.
- The browser app will not upload files to Mezon; images use already-hosted URLs and attachment metadata.
- A live test will not ping `@here` or other real users merely to prove mention delivery.

## Constraints

- The app remains a static React/Vite frontend.
- Webhook URLs remain masked and memory-only and are excluded from exports and local storage.
- Bot samples read `MEZON_BOT_ID`, `MEZON_BOT_TOKEN`, and `MEZON_CHANNEL_ID` from environment variables.
- All primary controls are at least 44 CSS px high on touch layouts; body text is at least 16px on small screens.
- Every drag reorder action also has Move up and Move down buttons.
- Existing version 2 projects import by mapping each legacy message body to `t` and discarding unsupported card/button data.

## Chosen approach

Replace the legacy Discord-like draft in the active UI with a version 3 webhook project schema. Keep legacy schema types only as an import boundary. A focused message editor manages the five documented fields, a focused preview renders only observable webhook output, and an advanced workbench owns raw JSON plus generated samples. Valid raw JSON replaces the selected message immediately; invalid JSON remains editable, preserves the last valid message, explains the error, and disables the single send action.

Alternatives rejected:

- Keeping the legacy composer and translating at send time preserves the state divergence that caused the audit failure.
- Making raw JSON the only editor is precise but not beginner-tolerant and does not address the reported usability problem.
- Mixing webhook and bot interactive builders in one form makes unsupported delivery look supported; bot-only features instead appear in the tested SDK documentation and support matrix.

## UX structure

- Header: product mark, global theme, and import/export. The theme stays visible because it affects the entire workspace.
- Desktop: 60% composer and 40% sticky preview.
- Mobile: Compose and Preview tabs with no horizontal scrolling.
- Composer: text first; collapsed optional formatting/mention/image/channel-reference groups; visible reorder controls.
- Advanced: raw JSON, cURL, Bot SDK sample, validation status, and copied feedback.
- Delivery: selected targets, masked URLs, and the only submit path.

## Protocol model

`ChannelWebhookMessage` contains:

- `t`: required non-empty string, maximum 2,000 characters.
- `mk`: `{ type: "pre" | "lk", s, e }[]`.
- `mentions`: `{ username XOR user_id, s, e }[]`.
- `images`: `{ fn, sz, url, ft, w, h }[]` with HTTPS URL and non-negative dimensions/size.
- `hg`: `{ channelId, s, e }[]`.

Ranges use zero-based start-inclusive/end-exclusive indexes and must satisfy `0 <= s < e <= t.length`.

For Bot SDK delivery, `t`, `mk`, and `hg` stay in `content`; `mentions` is the second `channel.send` argument; `images` map to SDK attachments as the third argument.

## Verification plan

- Unit tests: schema validation, v2 migration, exact envelope serialization, exact code generation, and strict rejection of unknown or mistyped fields.
- Component tests: form ↔ JSON bidirectional synchronization, disabled send state, restored target selection, ordered multi-message delivery, accessible reorder controls, and progressive disclosure.
- Build: TypeScript and Vite production build.
- Responsive UI: Chromium checks at 375×812, 844×390, 768×1024, and 1440×900, including keyboard navigation and reduced motion.
- Live webhook matrix: plain text, `pre`, `lk`, safe bot-self mention, hosted image, and channel hashtag.
- Live bot matrix: the generated JS flow for text/format/ranges/mentions/attachments plus SDK-only embed, buttons, input, select, radio, and date picker.
- Each live message contains a unique audit marker and the result is recorded in `docs/LIVE-VERIFICATION.md` without credentials.

