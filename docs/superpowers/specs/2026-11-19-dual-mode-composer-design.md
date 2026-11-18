# MezonHook Dual-Mode Composer Design

## Intent

Restore the Bot SDK composer that was removed from the running UI while preserving the verified Channel Webhook composer. Users must be able to choose the delivery contract they are building for instead of seeing Bot-only controls mixed into an invalid webhook payload.

## Goals

- Add a clear top-level mode switch: **Channel Webhook** and **Bot SDK**.
- Keep the current webhook project, delivery form, JSON envelope, cURL, and Bot SDK bridge sample working.
- Restore the existing Bot SDK editor for embeds, fields, buttons, inputs, selects, radios, date pickers, and animations.
- Generate copyable Bot SDK JavaScript from the complete Bot draft.
- Make Copy buttons report success only after data actually reaches the clipboard, with a browser-compatible fallback and visible failure state.
- Render webhook formatting, mentions, and channel references in the preview instead of showing only numeric metadata.
- Preserve existing stored projects and route imported v2/v3 files to the correct mode.

## Non-goals

- Do not send Bot SDK messages directly from the browser or expose bot credentials to the browser.
- Do not encode Bot-only embeds or interactive components into `type: "hook"` webhook payloads.
- Do not change the validated Channel Webhook wire schema.
- Do not silently convert rich Bot SDK projects into lossy webhook projects.

## Chosen Approach

Use two explicit composer modes sharing the current shell and theme:

1. **Channel Webhook mode** keeps the v3 `ChannelWebhookProject`, current delivery targets, webhook URL handling, and exact `type: "hook"` envelope.
2. **Bot SDK mode** uses the existing v2 `WebhookProject`/`MessageDraft` model and restores the orphaned `MessageEditor` UI and rich preview. It exports/copies runnable JavaScript; execution stays in an authenticated server or local process.

This was selected over a webhook-only repair because it would still leave the previously available Bot SDK functions inaccessible. It was selected over a single mixed project because the two delivery APIs accept different payload shapes and a mixed editor would produce misleading or invalid output.

## UX Contract

- A labeled two-option mode switch sits near the product identity and remains reachable on mobile.
- Switching modes never destroys either draft; each mode has independent persisted state.
- Import detects `version: 2` as Bot SDK and `version: 3` as Channel Webhook, switches modes, and displays a clear result/error.
- Export exports only the active mode with a mode-specific filename.
- Webhook preview applies ranges to visible text:
  - `pre` renders as code styling.
  - `lk` renders as a link only when the selected text is an HTTPS URL; otherwise it uses link styling without unsafe navigation.
  - mentions and channel references use distinct semantic styling and accessible labels.
- Range editors keep numeric fields for exact control, but adding a range uses the current textarea selection when available and explains when no selection exists.
- Copy buttons show `Copied …` only after success and show an actionable error when clipboard access fails.
- Bot mode explains that credentials remain in environment variables and that the browser only generates code.

## State and Migration

- Keep `mezonhook:project:v3` unchanged for Channel Webhook state.
- Add `mezonhook:bot-project:v2` for Bot SDK state.
- Persist the last selected mode separately. On first dual-mode startup, prefer Bot SDK only when legacy v2/draft data exists without v3 data; otherwise prefer Channel Webhook.
- Read both projects independently. Invalid saved data remains untouched and produces a visible recovery error instead of being overwritten.
- Read the former v2 project key as Bot SDK state instead of migrating it into the lossy v3 webhook shape.
- Continue supporting the legacy single-draft key as a Bot SDK recovery source, but do not use `draft-storage.ts` normalization because it strips interactive `inputs`; recover through the schema clone/normalization path that preserves them.
- Retain v2 `targets` during import/export for file fidelity while hiding webhook delivery controls in Bot mode.
- Never store webhook tokens or bot credentials.

## Code Structure

- Split the current `ProjectEditor` into a webhook-specific editor and a restored bot-specific editor, then route them from a small mode-aware shell.
- Reuse the existing schema factories, normalizers, validators, `MessageEditor`, and Bot preview rendering rather than duplicating domain logic.
- Add one clipboard helper used by every Copy action.
- Add a Bot SDK code generator that consumes normalized `MessageDraft` values and produces the documented send call.
- Generate the complete v2 message sequence, not only the currently inspected draft. Credentials and channel ID remain environment variables.
- Validate rich payload mapping against the SDK builders already exercised by `scripts/verify-live-messages.mjs`; do not assume `toMezonContent()` alone proves live parity.
- Generated sender code sends components but does not implement click/submission handlers; state that limitation beside the sample.
- Keep webhook-to-bot bridge generation separate from full Bot draft generation so their supported fields remain explicit.
- Scope restored Bot editor CSS below its mode root so it cannot override the webhook shell or responsive layout.

## Verification

- Existing v3 projects load without mutation.
- Existing v2 projects open in Bot SDK mode with embeds/components intact.
- Both mode drafts survive switching and reload.
- Copy success and failure states match the actual clipboard result.
- Clipboard fallback checks the boolean result of `execCommand('copy')`, restores focus/selection, clears stale success when the sample changes, and gives manual-selection guidance if copying is blocked.
- Webhook preview visibly renders `mk`, `mentions`, and `hg` ranges while the emitted JSON remains unchanged.
- Preview overlap precedence is mention/channel, then code, then link; code suppresses navigation and anchors are never nested. Invalid ranges are clamped for preview only and never rewrite the payload.
- Each message textarea remembers its last non-empty selection in a ref before Add controls receive focus. New ranges use that selection; otherwise the UI explains the fallback range.
- Demo user/channel identifiers are explicitly labeled illustrative rather than live Mezon IDs.
- Generated Bot SDK JavaScript is syntactically parseable and includes embeds/components from the draft.
- Desktop and mobile mode switching remain usable without horizontal overflow.

## Risks

- The current v2 storage migration is lossy; routing must be changed before the dual-mode reader writes anything.
- The old Bot editor CSS was removed and must be restored without reintroducing nested full-page scrolling.
- Overlapping webhook ranges need deterministic rendering; segments will be split by all range boundaries and assigned stable precedence without altering the payload.
