# MezonHook Project Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a Discohook-inspired local-first Mezon webhook project builder with multi-message composition, target configuration, preview, help, persistence, and batch sending.

**Architecture:** The schema package becomes the strict boundary for project state. Browser storage persists only normalized project metadata and messages, while session-only target URLs are UI state. Delivery receives an ordered draft list and sends the documented Mezon envelope to validated target URLs in deterministic order.

**Tech Stack:** React 18, TypeScript, Vite, Vitest, Testing Library, localStorage, Docker/nginx.

**Spec:** `docs/superpowers/specs/2026-09-07-project-builder-design.md`

## Global Constraints

- Preserve individual `MessageDraft`, current templates, and `{ type: 'hook', message: ... }` Mezon payload envelope.
- Persist/export no webhook URL; URL fields are `password` inputs and browser-session-only.
- Accept only `https://webhook.mezon.ai/webhooks/{channelId}/{token}` URLs.
- Migrate `mezonhook:draft:v1` once to `mezonhook:project:v2`.
- A project has 1–20 messages and 1–10 target slots; a batch must have at least one selected valid target.
- Do not add backend, account, cloud share, API-key, or Discord protocol functionality.

---

### Task 1: Strict project schema

**Files:**
- Modify: `packages/schema/src/index.ts`
- Modify: `packages/schema/src/index.test.ts`

**Interfaces:**
- Produces `WebhookProject`, `WebhookTarget`, `createWebhookProject`, `cloneProject`, `normalizeProject`, `validateProject`, `createMessageId`, and `createTargetId`.
- Consumes existing `MessageDraft`, `createAnnouncementDraft`, and `validateDraft`.

- [ ] **Step 1: Write failing schema tests**

```ts
it('creates a project with one editable message and one target slot', () => {
  const project = createWebhookProject();
  expect(project.messages).toHaveLength(1);
  expect(project.targets).toEqual([{ id: 'target-1', name: 'Mezon channel' }]);
});

it('normalizes nested untrusted project properties', () => {
  const project = createWebhookProject() as WebhookProject & { webhookUrl: string };
  project.webhookUrl = 'secret';
  project.messages[0].card.extra = 'discard' as never;
  expect(normalizeProject(project)).not.toHaveProperty('webhookUrl');
  expect(normalizeProject(project).messages[0].card).not.toHaveProperty('extra');
});

it('rejects project message and target bounds', () => {
  const project = createWebhookProject();
  project.messages = [];
  expect(validateProject(project).valid).toBe(false);
});
```

- [ ] **Step 2: Run the schema test file and verify it fails because the project exports do not exist**

Run: `rtk npm test --workspace @mezonhook/schema -- --run`

- [ ] **Step 3: Implement whitelisted project functions**

```ts
export interface WebhookTarget { id: string; name: string; }
export interface WebhookProject { version: 2; name: string; messages: MessageDraft[]; targets: WebhookTarget[]; }

export function createWebhookProject(): WebhookProject {
  return { version: 2, name: 'Untitled webhook project', messages: [createAnnouncementDraft()], targets: [{ id: 'target-1', name: 'Mezon channel' }] };
}
```

`normalizeProject` must build every root, message, card, field, button, and target property explicitly. `validateProject` checks version, name <= 100, 1–20 valid messages, 1–10 targets, and unique non-empty IDs/names.

- [ ] **Step 4: Run the schema tests and confirm they pass**

Run: `rtk npm test --workspace @mezonhook/schema -- --run`

- [ ] **Step 5: Commit**

```bash
rtk git add packages/schema/src/index.ts packages/schema/src/index.test.ts
rtk git commit -m "feat: add strict webhook project schema"
```

### Task 2: Project storage and legacy migration

**Files:**
- Create: `apps/web/src/project-storage.ts`
- Create: `apps/web/src/project-storage.test.ts`
- Modify: `apps/web/src/draft-storage.ts`

**Interfaces:**
- Consumes `WebhookProject`, `createWebhookProject`, `normalizeProject`, `validateProject`, and `MessageDraft`.
- Produces `PROJECT_STORAGE_KEY`, `readStoredProject`, `saveProject`, `importProjectJson`, and `normalizeProject`-backed data only.

- [ ] **Step 1: Write failing storage tests**

```ts
it('migrates the v1 draft once into a one-message project', () => {
  localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(createAnnouncementDraft()));
  expect(readStoredProject()).toMatchObject({ ok: true, project: { version: 2, messages: [expect.any(Object)] } });
});

it('does not persist or import a webhookUrl at any project level', () => {
  const imported = importProjectJson(JSON.stringify({ ...createWebhookProject(), webhookUrl: 'secret' }));
  expect(imported.ok && imported.project).not.toHaveProperty('webhookUrl');
});
```

- [ ] **Step 2: Run the web storage tests and verify they fail because project storage does not exist**

Run: `rtk npm test --workspace @mezonhook/web -- --run src/project-storage.test.ts`

- [ ] **Step 3: Implement versioned project persistence**

```ts
export const PROJECT_STORAGE_KEY = 'mezonhook:project:v2';

export function readStoredProject(): ProjectStorageResult {
  const saved = localStorage.getItem(PROJECT_STORAGE_KEY);
  if (saved !== null) return importProjectJson(saved);
  const legacy = readStoredDraft();
  return legacy.ok && legacy.draft
    ? { ok: true, project: { ...createWebhookProject(), messages: [legacy.draft] } }
    : { ok: false, error: 'No saved project was found.' };
}
```

Use `normalizeProject` before every return, store, and export. Do not remove the v1 key; a legacy user can still recover it if v2 storage is unavailable.

- [ ] **Step 4: Run project storage tests and full web tests**

Run: `rtk npm test --workspace @mezonhook/web -- --run`

- [ ] **Step 5: Commit**

```bash
rtk git add apps/web/src/project-storage.ts apps/web/src/project-storage.test.ts apps/web/src/draft-storage.ts
rtk git commit -m "feat: persist webhook projects locally"
```

### Task 3: Ordered batch delivery

**Files:**
- Modify: `apps/web/src/webhook.ts`
- Modify: `apps/web/src/webhook.test.ts`

**Interfaces:**
- Consumes `MessageDraft`, `validateDraft`, `toMezonContent`, and existing `validateWebhookUrl`.
- Produces `sendWebhookBatch(urls: string[], drafts: MessageDraft[], fetcher?): Promise<number>`.

- [ ] **Step 1: Write failing batch delivery tests**

```ts
it('sends each message in order to each target and returns the delivery count', async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
  const count = await sendWebhookBatch(['https://webhook.mezon.ai/webhooks/a/token', 'https://webhook.mezon.ai/webhooks/b/token'], [createAnnouncementDraft(), createDraftFromTemplate('Release note')], fetcher);
  expect(count).toBe(4);
  expect(fetcher.mock.calls.map(([url]) => url)).toEqual([
    'https://webhook.mezon.ai/webhooks/a/token', 'https://webhook.mezon.ai/webhooks/b/token',
    'https://webhook.mezon.ai/webhooks/a/token', 'https://webhook.mezon.ai/webhooks/b/token',
  ]);
});
```

- [ ] **Step 2: Run the webhook test file and verify batch export is missing**

Run: `rtk npm test --workspace @mezonhook/web -- --run src/webhook.test.ts`

- [ ] **Step 3: Implement batch validation and sequential delivery**

```ts
export async function sendWebhookBatch(urls: string[], drafts: MessageDraft[], fetcher: typeof fetch = fetch): Promise<number> {
  if (urls.length === 0) throw new Error('Select at least one Mezon webhook target.');
  if (drafts.length === 0 || drafts.some((draft) => !validateDraft(draft).valid)) throw new Error('Every message must be valid before sending.');
  if (urls.some((url) => !validateWebhookUrl(url))) throw new Error('Enter valid Mezon Channel Webhook URLs.');
  let count = 0;
  for (const draft of drafts) for (const url of urls) { await sendWebhook(url, draft, fetcher); count += 1; }
  return count;
}
```

Errors must remain token-safe. Keep `sendWebhook` as the one-message compatibility API.

- [ ] **Step 4: Run all webhook tests and full workspace test suite**

Run: `rtk npm test --workspace @mezonhook/web -- --run src/webhook.test.ts && rtk npm test`

- [ ] **Step 5: Commit**

```bash
rtk git add apps/web/src/webhook.ts apps/web/src/webhook.test.ts
rtk git commit -m "feat: send webhook projects in order"
```

### Task 4: Project builder, config, help, and sequence preview

**Files:**
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/web/src/App.test.tsx`
- Modify: `apps/web/src/styles.css`

**Interfaces:**
- Consumes Task 1 project functions, Task 2 project storage, and Task 3 batch delivery.
- Produces interactive Builder, Config, and Help screens with no persisted URL secrets.

- [ ] **Step 1: Write failing UI tests**

```ts
it('adds a message and renders both messages in sequence preview', async () => {
  render(<App />);
  await user.click(screen.getByRole('button', { name: 'Add message' }));
  expect(screen.getAllByTestId('message-preview')).toHaveLength(2);
});

it('keeps target URLs masked and session-only in Config', async () => {
  render(<App />);
  await user.click(screen.getByRole('button', { name: 'Config' }));
  expect(screen.getByLabelText('Webhook URL for Mezon channel')).toHaveAttribute('type', 'password');
});

it('shows in-app help with official Mezon documentation', async () => {
  render(<App />);
  await user.click(screen.getByRole('button', { name: 'Help' }));
  expect(screen.getByRole('link', { name: 'Open Mezon documentation' })).toHaveAttribute('href', 'https://mezon.ai/docs/vi/');
});
```

- [ ] **Step 2: Run UI tests and verify they fail because the project actions and views are absent**

Run: `rtk npm test --workspace @mezonhook/web -- --run src/App.test.tsx`

- [ ] **Step 3: Replace single-draft state with project state and lifecycle controls**

Use `project`, `selectedMessageId`, `activeScreen`, and a `Record<string, string>` for session target URLs. Add the following actions:

```ts
addMessage(); duplicateSelectedMessage(); removeSelectedMessage(); moveSelectedMessage(direction: -1 | 1);
addTarget(); removeTarget(id: string); updateTargetName(id: string, name: string); updateTargetUrl(id: string, url: string);
```

Enforce the schema bounds in the UI, preserve a selected message after mutations, call `saveProject(project)` on changes, use `importProjectJson`/normalized JSON for import/export, and invoke `sendWebhookBatch` using only target URLs with non-empty values. Clear session URL state only after successful batch delivery.

- [ ] **Step 4: Render top navigation, message rail, sequence preview, Config, and Help**

Builder must retain the existing full message/card/actions form for the selected message. The preview must render every project message in order and identify the selected one. Config must offer up to ten named target slots, selected checkboxes, masked URL fields, and a plain-language session-only note. Help must cover acquiring a Mezon webhook, multi-message order, target settings, import/export, failure recovery, and link to `https://mezon.ai/docs/vi/` with `target="_blank" rel="noreferrer"`.

- [ ] **Step 5: Style the product navigation and responsive message rail**

Add styles for header, navigation tabs, builder grid, selected rail items, message action row, preview sequence gap, configuration rows, help cards, and a mobile one-column fallback. Preserve existing Mezon preview rail, field grouping, and button styles.

- [ ] **Step 6: Run UI, full workspace, and production-build verification**

Run: `rtk npm test --workspace @mezonhook/web -- --run && rtk npm test && rtk npm run build --workspace @mezonhook/web`

- [ ] **Step 7: Commit**

```bash
rtk git add apps/web/src/App.tsx apps/web/src/App.test.tsx apps/web/src/styles.css
rtk git commit -m "feat: build multi-message Mezon webhook workspace"
```

### Task 5: Documentation and deploy verification

**Files:**
- Modify: `README.md`
- Modify: `docs/USAGE.md`
- Modify: `docs/DEPLOYMENT.md`
- Modify: `Dockerfile` only if the current static-serving contract needs correction.

**Interfaces:**
- Documents the completed local-first project builder; does not change API behavior.

- [ ] **Step 1: Update the README feature and safety sections**

Document Message projects, targets, session-only URLs, ordered batch delivery, local persistence, Help, and the deployed URL. Keep the MIT licensing and no-backend statement.

- [ ] **Step 2: Update usage and deployment instructions**

Show exact user flow: create project → add/reorder messages → configure named targets → select targets → send all → export/import. Explain that a failure stops the ordered delivery sequence and may leave earlier messages delivered. Preserve Docker run/build commands and mention the live domain.

- [ ] **Step 3: Run documentation reference checks and Docker build**

Run: `rtk rg -n "mezonhook:draft:v1|Send message|single message" README.md docs || true && rtk docker build -t mezonhook:project-builder .`

- [ ] **Step 4: Commit**

```bash
rtk git add README.md docs/USAGE.md docs/DEPLOYMENT.md Dockerfile
rtk git commit -m "docs: document project webhook workflow"
```
