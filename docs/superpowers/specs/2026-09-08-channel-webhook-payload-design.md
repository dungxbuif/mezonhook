# Channel Webhook Payload Design

## Goal

Replace the unsupported Discord-like message composer with a browser-only builder for the Channel Webhook payload that Mezon documents and renders.

## Constraints

- The product remains frontend-only; it must not collect or persist bot tokens.
- A Channel Webhook URL exists only in browser memory and is never exported.
- The send envelope is always `{ type: "hook", message: ChannelWebhookMessage }`.
- The supported message fields are `t`, `mk`, `mentions`, `images`, and `hg`.
- Bot-only `embed` and `components` are explanatory documentation, never delivery controls.

## Design

`ChannelWebhookMessage` replaces the existing card/button draft. The visual editor edits text and structured lists for markdown ranges, mentions, images, and channel tags. A live JSON panel renders the exact send envelope. Editing valid JSON updates the form immediately; invalid JSON preserves the last valid form data, shows a validation message, and disables sending.

The live payload is stored as normal project message data, while the selected webhook URL remains session-only. A compact Mezon-style preview renders text and attached images only. An inline SDK note explains that interactive embeds need an authenticated bot process that handles actions.

## Acceptance Criteria

- Editing either the form or valid raw JSON updates the other representation without a reload.
- Invalid JSON or an invalid documented payload prevents delivery and gives a specific error.
- Sending serializes the inspected envelope exactly.
- Existing legacy card projects import safely by retaining their body as `t` and discarding unsupported card/button data.
- The UI no longer offers embeds, buttons, inputs, selects, radio controls, date pickers, or animations as webhook features.
