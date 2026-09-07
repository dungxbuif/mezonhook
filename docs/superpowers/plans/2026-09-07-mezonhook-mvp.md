# MezonHook MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a locally persistent Mezon rich-message composer with templates and live preview.

**Architecture:** An npm-workspaces monorepo separates the React web UI from a framework-free schema package. The UI edits a single validated draft, renders it through a preview component, and persists a versioned JSON document locally.

**Tech Stack:** Node.js, npm workspaces, Vite, React, TypeScript, Vitest, Testing Library.

**Spec:** `docs/superpowers/specs/2026-09-07-mezonhook-mvp-design.md`

## Global Constraints

- Keep Mezon message types in `packages/schema`; React must not be a dependency of that package.
- Do not store credentials or claim an undocumented sending endpoint.
- Render message text as text, not HTML.
- Use the documented Mezon rich-card and button shape as the export basis.
- Adapt the preview from `/Users/dungxbuif/workspace/mezon/libs/components/src/lib/components/EmbedMessage/EmbedMessage.tsx`, `EmbedFields.tsx`, and `MessageActionsPanel`; preserve the 520px card, left color rail, field grouping, and five Mezon button styles.

---

### Task 1: Workspace and message-schema package

**Files:**
- Create: `package.json`, `tsconfig.json`, `packages/schema/package.json`, `packages/schema/src/index.ts`, `packages/schema/src/index.test.ts`

**Interfaces:**
- Produces: `MessageDraft`, `createAnnouncementDraft()`, `messageTemplates`, `validateDraft()`, `toMezonContent()`.

- [ ] **Step 1: Write the failing schema tests**

```ts
import { createAnnouncementDraft, toMezonContent, validateDraft } from './index';

it('exports an announcement as Mezon rich content', () => {
  const content = toMezonContent(createAnnouncementDraft());
  expect(content.embed[0].title).toBe('Announcement');
  expect(content.components[0].components[0].component.label).toBe('Learn more');
});

it('rejects a card with more than 25 fields', () => {
  const draft = createAnnouncementDraft();
  draft.card.fields = Array.from({ length: 26 }, () => ({ name: 'N', value: 'V', inline: false }));
  expect(validateDraft(draft).valid).toBe(false);
});
```

- [ ] **Step 2: Run the schema test and verify it fails because the module is absent**

Run: `npm test --workspace @mezonhook/schema`

- [ ] **Step 3: Implement the smallest typed draft model, three templates, validation, and Mezon export**

- [ ] **Step 4: Run schema tests and verify they pass**

Run: `npm test --workspace @mezonhook/schema`

- [ ] **Step 5: Commit**

```bash
git add package.json tsconfig.json packages/schema
git commit -m "feat: add Mezon message schema"
```

### Task 2: Web editor and live preview

**Files:**
- Create: `apps/web/package.json`, `apps/web/index.html`, `apps/web/src/main.tsx`, `apps/web/src/App.tsx`, `apps/web/src/App.test.tsx`, `apps/web/src/styles.css`

**Interfaces:**
- Consumes: `MessageDraft` and `messageTemplates` from `@mezonhook/schema`.
- Produces: Editable message draft and live card preview.

- [ ] **Step 1: Write the failing component test**

```tsx
render(<App />);
await user.click(screen.getByRole('button', { name: 'Release note' }));
expect(screen.getByTestId('message-preview')).toHaveTextContent('Release notes');
```

- [ ] **Step 2: Run the component test and verify it fails because the app is absent**

Run: `npm test --workspace @mezonhook/web`

- [ ] **Step 3: Implement template picker, editable rich-card controls, buttons, and a text-only preview**

- [ ] **Step 4: Run web tests and verify they pass**

Run: `npm test --workspace @mezonhook/web`

- [ ] **Step 5: Commit**

```bash
git add apps/web
git commit -m "feat: add webhook builder editor"
```

### Task 3: Local drafts, import/export, webhook send, and integration verification

**Files:**
- Create: `apps/web/src/draft-storage.ts`, `apps/web/src/draft-storage.test.ts`, `apps/web/src/webhook.ts`, `apps/web/src/webhook.test.ts`
- Modify: `apps/web/src/App.tsx`, `apps/web/src/App.test.tsx`, `apps/web/src/styles.css`

**Interfaces:**
- Consumes: `validateDraft()` and `toMezonContent()` from `@mezonhook/schema`.
- Produces: Versioned local draft persistence, safe JSON import/export, and direct Mezon Channel Webhook delivery without persistent credentials.

- [ ] **Step 1: Write failing tests for reload persistence, invalid import rejection, and webhook request formation**

```tsx
expect(window.localStorage.getItem('mezonhook:draft:v1')).toContain('Announcement');
await user.upload(screen.getByLabelText('Import template'), new File(['{}'], 'draft.json'));
expect(await screen.findByRole('alert')).toHaveTextContent('Invalid template');

expect(validateWebhookUrl('https://other.example/hook')).toBe(false);
await sendWebhook('https://webhook.mezon.ai/webhooks/123/token', draft, fetchStub);
expect(fetchStub).toHaveBeenCalledWith(
  'https://webhook.mezon.ai/webhooks/123/token',
  expect.objectContaining({ method: 'POST', headers: { 'Content-Type': 'application/json' } }),
);
```

- [ ] **Step 2: Run the tests and verify they fail for missing persistence/import behavior**

Run: `npm test --workspace @mezonhook/web`

- [ ] **Step 3: Add versioned `localStorage` persistence, validated import, JSON download export, and a Mezon Channel Webhook send form**

The send form keeps the webhook URL in component memory only. It rejects URLs other than `https://webhook.mezon.ai/webhooks/{channelId}/{token}`, validates the draft, and sends `JSON.stringify({ type: 'hook', message: toMezonContent(draft) })` using `POST` and `Content-Type: application/json`. Display success, HTTP failure, network failure, and CORS failure feedback without exposing or persisting the token.

- [ ] **Step 4: Run full tests and production build**

Run: `npm test && npm run build`

- [ ] **Step 5: Commit**

```bash
git add apps/web
git commit -m "feat: persist and export MezonHook drafts"
```
