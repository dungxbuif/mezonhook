# Channel Webhook Payload Implementation Plan
> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a payload-first, actually deliverable Mezon Channel Webhook composer.

**Architecture:** The schema owns a documented `ChannelWebhookMessage` and converts it into the fixed webhook envelope. React derives both the structured form and editable JSON panel from that data. The delivery layer sends only the generated envelope.

**Tech Stack:** TypeScript, React, Vite, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-08-channel-webhook-payload-design.md`

## Global Constraints

- Frontend-only; no bot token storage or backend.
- Webhook URLs stay session-only and excluded from exports.
- Only `t`, `mk`, `mentions`, `images`, and `hg` are exposed as Channel Webhook fields.

---

### Task 1: Channel payload schema and converter

**Files:**
- Modify: `packages/schema/src/index.ts`
- Test: `packages/schema/src/index.test.ts`

**Produces:** `ChannelWebhookMessage`, `WebhookDraft`, `validateWebhookDraft`, and `toWebhookEnvelope`.

- [ ] **Step 1: Write the failing schema tests**

```ts
expect(validateWebhookDraft({ t: 'Hello', mk: [{ type: 'pre', s: 0, e: 5 }], mentions: [], images: [], hg: [] }).valid).toBe(true);
expect(toWebhookEnvelope({ t: 'Hello', mk: [], mentions: [], images: [], hg: [] })).toEqual({ type: 'hook', message: { t: 'Hello', mk: [], mentions: [], images: [], hg: [] } });
```

- [ ] **Step 2: Run the schema test and verify it fails**

Run: `npm test --workspace @mezonhook/schema`

- [ ] **Step 3: Implement the documented payload types and validation**

```ts
export interface WebhookDraft { t: string; mk: MarkdownRange[]; mentions: MentionRange[]; images: WebhookImage[]; hg: HashtagRange[]; }
export const toWebhookEnvelope = (message: WebhookDraft) => ({ type: 'hook' as const, message: cloneWebhookDraft(message) });
```

- [ ] **Step 4: Run schema tests and verify they pass**

Run: `npm test --workspace @mezonhook/schema`

### Task 2: Delivery and migration

**Files:**
- Modify: `apps/web/src/webhook.ts`, `apps/web/src/project-storage.ts`
- Test: `apps/web/src/webhook.test.ts`, `apps/web/src/project-storage.test.ts`

**Produces:** delivery that sends the inspected envelope and legacy migration that preserves only old body text.

- [ ] **Step 1: Write failing delivery tests**

```ts
await sendWebhook('https://webhook.mezon.ai/webhooks/123/token', { t: 'Hello', mk: [], mentions: [], images: [], hg: [] }, fetcher);
expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({ type: 'hook', message: { t: 'Hello', mk: [], mentions: [], images: [], hg: [] } });
```

- [ ] **Step 2: Implement converter-only delivery and migration**

```ts
body: JSON.stringify(toWebhookEnvelope(sanitizedDraft))
```

- [ ] **Step 3: Run web tests**

Run: `npm test --workspace @mezonhook/web`

### Task 3: Form, preview, and live JSON session editor

**Files:**
- Create: `apps/web/src/components/PayloadEditor.tsx`, `apps/web/src/components/PayloadPreview.tsx`
- Modify: `apps/web/src/App.tsx`, `apps/web/src/components/ProjectEditor.tsx`, `apps/web/src/styles.css`
- Test: `apps/web/src/App.test.tsx`

**Produces:** two-way form/JSON editing, invalid-payload send protection, and a webhook-only preview.

- [ ] **Step 1: Write failing UI tests**

```tsx
await user.type(screen.getByLabelText('Message text'), 'Ping');
expect(screen.getByLabelText('Live payload')).toHaveValue(expect.stringContaining('"t": "Ping"'));
await user.clear(screen.getByLabelText('Live payload'));
await user.type(screen.getByLabelText('Live payload'), '{');
expect(screen.getByText('Payload JSON is invalid.')).toBeInTheDocument();
expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
```

- [ ] **Step 2: Implement payload-first editor**

```tsx
<textarea aria-label="Live payload" value={payloadText} onChange={onPayloadTextChange} />
```

- [ ] **Step 3: Run UI tests and build**

Run: `npm test --workspace @mezonhook/web && npm run build --workspace @mezonhook/web`

### Task 4: Documentation and end-to-end verification

**Files:**
- Modify: `README.md`, `apps/web/src/components/HelpPanel.tsx`

- [ ] **Step 1: Document channel webhook capability boundary and raw payload editing.**
- [ ] **Step 2: Run all tests, build, Docker build, and a test send using a user-provided webhook only.**

