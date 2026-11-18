# Dual-Mode Composer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the full Bot SDK composer beside the existing Channel Webhook composer, repair copying, and make webhook rich ranges visibly usable without mixing the two delivery contracts.

**Architecture:** `App` owns a persisted `ComposerMode` and two independent project states. Webhook mode continues using `ChannelWebhookProject`; Bot SDK mode uses the existing v2 `WebhookProject`/`MessageDraft` model, restored under separately scoped UI and storage. Shared utilities detect imported project versions, copy text reliably, and generate environment-only runnable Bot SDK code.

**Tech Stack:** React 19, TypeScript 5.9, Vite 7, Vitest/JSDOM, `mezon-sdk`, CSS.

**Spec:** `docs/superpowers/specs/2026-11-19-dual-mode-composer-design.md`

## Global Constraints

- Never send Bot SDK credentials or tokens to the browser, local storage, export files, or generated literals.
- Never encode Bot-only embeds/components into a Channel Webhook `type: "hook"` payload.
- Preserve `mezonhook:project:v3`; store Bot SDK state under `mezonhook:bot-project:v2` and mode under `mezonhook:composer-mode`.
- Import version 2 into Bot SDK mode and version 3 into Channel Webhook mode without lossy conversion.
- Keep one natural document scroll; do not restore the former nested full-height editor scrolling.
- Scope restored Bot CSS under `.bot-composer`.

## Review Focus

- A malformed saved v2 project must not erase the valid v3 project or be overwritten during startup; Task 1 adds this case.
- A legacy draft containing `field.inputs` must retain the complete interactive structure; Task 1 adds this case.
- Clipboard APIs may be missing or reject despite a secure page; Task 2 exercises native, fallback, and total-failure paths.
- Webhook ranges may overlap or be temporarily invalid while edited; Task 3 pins precedence and non-mutating preview behavior.
- Bot projects may contain multiple messages and interactive fields whose generated SDK calls differ; Task 4 exercises the full sequence and every supported component type.

---

### Task 1: Lossless Dual-Mode Storage and Import Routing

**Files:**
- Create: `apps/web/src/composer-storage.ts`
- Create: `apps/web/src/composer-storage.test.ts`
- Modify: `apps/web/src/project-storage.ts`
- Modify: `apps/web/src/project-storage.test.ts`
- Modify: `apps/web/src/App.tsx`

**Interfaces:**
- Produces: `export type ComposerMode = 'webhook' | 'bot'`.
- Produces: `readComposerState(): { mode: ComposerMode; webhook: ChannelWebhookProject; bot: WebhookProject; errors: string[] }`.
- Produces: `saveComposerMode(mode: ComposerMode): void`, `saveBotProject(project: WebhookProject): ProjectStorageResult<WebhookProject>`.
- Produces: `importComposerProject(text: string): { ok: true; mode: ComposerMode; project: ChannelWebhookProject | WebhookProject } | { ok: false; error: string }`.
- Consumes: schema `cloneProject`, `normalizeProject`, `validateProject`, `cloneChannelWebhookProject`, and `validateChannelWebhookProject`.

- [ ] **Step 1: Write failing storage tests**

Add tests named:

- `routes version 2 imports to bot without dropping interactive inputs`
- `routes version 3 imports to webhook without mutation`
- `restores both projects independently and honors the saved mode`
- `prefers bot only when legacy data exists without version 3 data`
- `keeps valid state when the other stored project is malformed`

Use a v2 fixture containing a type-3 input with `placeholder`, `defaultValue`, `textarea`, and `disabled`; assert literal deep equality after import and reload.

- [ ] **Step 2: Run storage tests and verify RED**

Run: `npm test --workspace @mezonhook/web -- composer-storage.test.ts project-storage.test.ts`

Expected: FAIL because `composer-storage.ts` and version-routed import do not exist.

- [ ] **Step 3: Implement the storage interfaces**

Keep raw invalid stored values untouched. Read both modes before any effects save defaults. Route legacy single drafts through a v2 project constructed with schema clone/normalization, never `normalizeDraft()`.

- [ ] **Step 4: Wire `App` startup to the dual state without rendering Bot mode yet**

Replace the single `initialProject()` with `readComposerState()`. Persist webhook, bot, and mode independently. Change import/export handlers to operate on the active mode and use filenames `mezonhook-webhook-project.json` and `mezonhook-bot-project.json`.

- [ ] **Step 5: Run storage and App tests**

Run: `npm test --workspace @mezonhook/web -- composer-storage.test.ts project-storage.test.ts App.test.tsx`

Expected: PASS with both stored schemas preserved.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/composer-storage.ts apps/web/src/composer-storage.test.ts apps/web/src/project-storage.ts apps/web/src/project-storage.test.ts apps/web/src/App.tsx
git commit -m "feat: preserve webhook and bot composer state"
```

### Task 2: Truthful Clipboard and Bot SDK Code Generation

**Files:**
- Create: `apps/web/src/clipboard.ts`
- Create: `apps/web/src/clipboard.test.ts`
- Create: `apps/web/src/bot-code-samples.ts`
- Create: `apps/web/src/bot-code-samples.test.ts`
- Modify: `apps/web/src/components/PayloadWorkbench.tsx`
- Modify: `apps/web/src/code-samples.ts`

**Interfaces:**
- Produces: `copyText(text: string): Promise<void>`; resolves only after native or fallback copy succeeds and rejects with a user-actionable message otherwise.
- Produces: `makeBotProjectSample(project: WebhookProject): string` generating one authenticated client/channel session and ordered sends for every message.
- Consumes: schema `validateProject`, normalized `MessageDraft`, and builder semantics demonstrated in `scripts/verify-live-messages.mjs`.

- [ ] **Step 1: Write failing clipboard tests**

Cover:

- native `navigator.clipboard.writeText` success;
- native rejection followed by `execCommand('copy') === true`;
- missing native clipboard plus fallback success;
- both mechanisms unavailable/failing rejects and restores the prior selection/focus.

- [ ] **Step 2: Run clipboard tests and verify RED**

Run: `npm test --workspace @mezonhook/web -- clipboard.test.ts`

Expected: FAIL because `copyText` does not exist.

- [ ] **Step 3: Implement `copyText` and use it in `PayloadWorkbench`**

Add `copyStatus: { kind: 'success' | 'error'; message: string } | null`. Clear it whenever generated sample text changes. Never render `Copied …` before the promise resolves.

- [ ] **Step 4: Write failing Bot sample tests**

Build a two-message v2 project whose drafts cover embed fields, buttons, input, select, radio, date picker, and animation. Assert the generated source:

- contains environment checks for `MEZON_BOT_ID`, `MEZON_BOT_TOKEN`, and `MEZON_CHANNEL_ID`;
- imports `MezonClient`, `InteractiveBuilder`, `ButtonBuilder`, and `EButtonMessageStyle`;
- contains two ordered `await channel.send(...)` calls;
- contains the corresponding builder calls for every supported interactive type;
- contains no credential literal;
- parses as an async JavaScript body after removing the import.

- [ ] **Step 5: Run Bot sample tests and verify RED**

Run: `npm test --workspace @mezonhook/web -- bot-code-samples.test.ts`

Expected: FAIL because full-project Bot generation does not exist.

- [ ] **Step 6: Implement `makeBotProjectSample(project)`**

Generate builder expressions from normalized drafts, using the exact SDK method families proven in `verify-live-messages.mjs`. Preserve message order. Add an adjacent note in the eventual UI that generated code sends components but does not register click/submission handlers.

- [ ] **Step 7: Run focused tests**

Run: `npm test --workspace @mezonhook/web -- clipboard.test.ts bot-code-samples.test.ts code-samples.test.ts`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/clipboard.ts apps/web/src/clipboard.test.ts apps/web/src/bot-code-samples.ts apps/web/src/bot-code-samples.test.ts apps/web/src/components/PayloadWorkbench.tsx apps/web/src/code-samples.ts
git commit -m "fix: generate and copy reliable SDK samples"
```

### Task 3: Usable Webhook Rich Ranges and Preview

**Files:**
- Create: `apps/web/src/rich-text.tsx`
- Create: `apps/web/src/rich-text.test.tsx`
- Modify: `apps/web/src/components/ChannelMessageEditor.tsx`
- Modify: `apps/web/src/components/MessagePreview.tsx`
- Modify: `apps/web/src/styles.css`
- Modify: `apps/web/src/App.test.tsx`

**Interfaces:**
- Produces: `renderWebhookText(message: ChannelWebhookMessage): ReactNode`.
- Produces: deterministic segment precedence `mention/channel > pre > lk`; `pre` suppresses link navigation; invalid ranges are clamped for rendering only.
- `ChannelMessageEditor` stores the last non-empty textarea selection per message and uses it for newly added ranges.

- [ ] **Step 1: Write failing rich preview tests**

Test literal DOM outcomes for:

- `pre` range rendered as `<code>`;
- valid HTTPS `lk` range rendered as an anchor with safe `rel` attributes;
- non-HTTPS `lk` range styled but not navigable;
- mention and channel ranges rendered with accessible labels;
- overlapping mention/pre/link produces no nested anchor and follows precedence;
- out-of-bounds temporary ranges do not throw and do not mutate the source message.

- [ ] **Step 2: Run rich preview tests and verify RED**

Run: `npm test --workspace @mezonhook/web -- rich-text.test.tsx`

Expected: FAIL because the renderer does not exist.

- [ ] **Step 3: Implement boundary-split rich rendering and integrate `MessagePreview`**

Split on every clamped range boundary, assign each segment the highest-precedence semantic, and preserve whitespace. Retain the metadata list as exact payload diagnostics below the visual preview.

- [ ] **Step 4: Write failing selection UX tests**

In `App.test.tsx`, select a known substring in Message text, click each Add control, and assert the created start/end values equal that selection. Add a no-selection case asserting the fallback is `0–1` and helper copy explains how to select text.

- [ ] **Step 5: Run selection tests and verify RED**

Run: `npm test --workspace @mezonhook/web -- App.test.tsx`

Expected: FAIL because Add controls always create `0–1`.

- [ ] **Step 6: Implement selection-backed range creation**

Capture `selectionStart`/`selectionEnd` in a ref on textarea selection. Use the last non-empty selection when Add formatting, Add mention, or Add channel reference is clicked; keep numeric inputs for exact editing.

- [ ] **Step 7: Run focused tests**

Run: `npm test --workspace @mezonhook/web -- rich-text.test.tsx App.test.tsx`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/rich-text.tsx apps/web/src/rich-text.test.tsx apps/web/src/components/ChannelMessageEditor.tsx apps/web/src/components/MessagePreview.tsx apps/web/src/styles.css apps/web/src/App.test.tsx
git commit -m "feat: render and edit webhook rich ranges"
```

### Task 4: Restore the Bot SDK Composer as a Separate Mode

**Files:**
- Create: `apps/web/src/components/BotProjectEditor.tsx`
- Create: `apps/web/src/components/BotMessagePreview.tsx`
- Create: `apps/web/src/components/BotPayloadWorkbench.tsx`
- Modify: `apps/web/src/components/MessageEditor.tsx`
- Modify: `apps/web/src/components/ProjectEditor.tsx`
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/web/src/App.test.tsx`
- Modify: `apps/web/src/styles.css`

**Interfaces:**
- Consumes: Task 1 `ComposerMode` and independent project state.
- Consumes: Task 2 `copyText` and `makeBotProjectSample`.
- Produces: `BotProjectEditor` editing `WebhookProject` via immutable project callbacks.
- Produces: top-level mode switch with accessible selected state.

- [ ] **Step 1: Write failing App integration tests**

Cover:

- both labeled modes are present and Channel Webhook is selected for a fresh install;
- switching to Bot SDK exposes Content, Embeds, Fields, Components, and Advanced editors;
- input/select/radio/date/animation controls update Bot state and survive switching away/back;
- v2 import switches to Bot SDK and v3 import switches to Channel Webhook;
- active-mode export uses the correct schema version and filename;
- Bot mode shows no webhook URL or Send button;
- generated Bot code includes all messages and the interaction-handler limitation.

- [ ] **Step 2: Run App tests and verify RED**

Run: `npm test --workspace @mezonhook/web -- App.test.tsx`

Expected: FAIL because no mode switch or Bot editor is mounted.

- [ ] **Step 3: Restore Bot preview semantics in `BotMessagePreview`**

Port the prior embed rail/card/fields/buttons/interactive previews from history, adapting only class scoping and current theme tokens. Keep controls preview-only and non-submitting.

- [ ] **Step 4: Build `BotProjectEditor` around the existing `MessageEditor`**

Support project naming, add/duplicate/remove/move message controls, mobile Compose/Preview tabs, and natural page scrolling. Do not reintroduce drag-only ordering; visible move buttons remain the keyboard/touch path.

- [ ] **Step 5: Add `BotPayloadWorkbench`**

Show normalized v2 JSON, runnable Bot SDK JavaScript, Copy buttons using Task 2, and the explicit note that click/submission handlers are not generated.

- [ ] **Step 6: Add mode routing in `App`**

Render the current webhook editor/delivery only for webhook mode and the Bot editor/workbench only for Bot mode. Keep import/export shared and mode-aware.

- [ ] **Step 7: Restore scoped Bot CSS**

Port only the editor, embed, component, and interactive-preview rules under `.bot-composer`. Reuse current shell/pane/sticky/mobile contracts rather than the old `100vh`/nested-scroll rules.

- [ ] **Step 8: Run focused tests and build**

Run: `npm test --workspace @mezonhook/web -- App.test.tsx bot-code-samples.test.ts composer-storage.test.ts && npm run build --workspace @mezonhook/web`

Expected: PASS and production assets build.

- [ ] **Step 9: Commit**

```bash
git add apps/web/src/components/BotProjectEditor.tsx apps/web/src/components/BotMessagePreview.tsx apps/web/src/components/BotPayloadWorkbench.tsx apps/web/src/components/MessageEditor.tsx apps/web/src/components/ProjectEditor.tsx apps/web/src/App.tsx apps/web/src/App.test.tsx apps/web/src/styles.css
git commit -m "feat: restore the Bot SDK composer"
```

### Task 5: End-to-End Verification, Documentation, and Release Readiness

**Files:**
- Modify: `README.md`
- Modify: `docs/USAGE.md`
- Modify: `llms.txt`
- Modify: `scripts/verify-live-messages.mjs`
- Modify: `docs/superpowers/specs/2026-11-19-dual-mode-composer-design.md` only if implementation rulings require clarification

**Interfaces:**
- Consumes all earlier task interfaces.
- Produces documented separation between webhook delivery and Bot SDK generation/execution.

- [ ] **Step 1: Extend dry-run verification for the full Bot project sample**

Generate the new full-project sample into a temporary `.mjs`, execute it only in authorized live mode, and record per-format results without exposing credentials. Keep the authorized channel guard `2096923994367201280`.

- [ ] **Step 2: Update user and agent documentation**

Document mode selection, v2/v3 import routing, separate storage, clipboard failure guidance, webhook range selection, Bot code execution requirements, and the fact that interaction handlers are separate application code.

- [ ] **Step 3: Run the full suite and build**

Run: `npm test && npm run build --workspace @mezonhook/web && npm run verify:live -- --mode=dry-run`

Expected: 63 existing tests plus all new tests pass; build succeeds; dry run plans webhook and Bot formats.

- [ ] **Step 4: Browser-check responsive flows**

At 375×812, 844×390, 1440×900, 1920×1080, and the current ultra-wide viewport, verify:

- no horizontal document overflow;
- mode switch remains reachable;
- both modes preserve state while switching;
- webhook ranges render visually;
- Bot embeds/components render;
- Copy reports actual success/failure;
- Delivery appears only in webhook mode;
- existing oversized-preview fallback remains correct.

- [ ] **Step 5: Inspect final diff and repository state**

Run: `git diff --check && git status --short && git log --oneline --decorate -8`

Expected: clean tracked tree after commits, no credentials, no unrelated changes.

- [ ] **Step 6: Commit documentation and verification changes**

```bash
git add README.md docs/USAGE.md llms.txt scripts/verify-live-messages.mjs docs/superpowers/specs/2026-11-19-dual-mode-composer-design.md docs/superpowers/plans/2026-11-19-dual-mode-composer.md
git commit -m "docs: explain dual webhook and bot workflows"
```
