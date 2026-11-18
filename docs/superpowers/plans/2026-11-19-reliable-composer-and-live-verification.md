# Reliable Composer and Live Verification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a coherent webhook composer whose form, preview, JSON, samples, persistence, and delivery all represent the same validated messages, then prove support with live webhook and bot tests.

**Architecture:** Add a strict version 3 Channel Webhook schema and migrate legacy projects at the storage boundary. Refactor the React workspace around the v3 model, generate executable samples from the same serializer used for delivery, and keep credentialed verification in an opt-in script driven by environment variables.

**Tech Stack:** TypeScript, React 19, Vite, Vitest, Testing Library, Mezon JavaScript SDK.

**Spec:** `docs/superpowers/specs/2026-11-19-reliable-composer-and-live-verification-design.md`

## Global Constraints

- Static frontend; no bot credentials in browser code or persisted state.
- Webhook URLs stay memory-only and excluded from import/export.
- Version 2 imports preserve only legacy `body` as webhook `t`.
- Touch controls are at least 44px on small screens and reorder has button alternatives.
- Live verification only targets channel `2096923994367201280` and must not ping real users.

## Review Focus

- Unicode range indexes must match Mezon's actual character indexing for Vietnamese text and emoji.
- A malformed raw envelope must never overwrite the last valid form state or enable Send.
- Multi-message/multi-target delivery order must be deterministic and failures must report partial delivery.
- Generated Bot SDK code must compile/run with current SDK configuration and separate mentions/attachments correctly.
- Imported legacy or stored projects must not reintroduce secrets or unsupported card/button fields.

---

### Task 1: Strict webhook schema and migration

**Files:**
- Modify: `packages/schema/src/index.ts`
- Modify: `packages/schema/src/index.test.ts`
- Modify: `apps/web/src/project-storage.ts`
- Modify: `apps/web/src/project-storage.test.ts`

**Interfaces:**
- Produces: `ChannelWebhookMessage`, `ChannelWebhookProject`, `createChannelWebhookProject`, `validateChannelWebhookMessage`, `toChannelWebhookEnvelope`, and v2→v3 project import.

- [ ] Write failing literal/table tests for all valid fields, unknown/mistyped fields, range bounds, and v2 migration.
- [ ] Run focused schema/storage tests and confirm RED for missing v3 interfaces.
- [ ] Implement the smallest strict v3 model and migration needed by the tests.
- [ ] Run focused tests and the full workspace suite.

### Task 2: One-state composer and ordered delivery

**Files:**
- Create: `apps/web/src/components/ChannelMessageEditor.tsx`
- Modify: `apps/web/src/components/MessagePreview.tsx`
- Modify: `apps/web/src/components/ProjectEditor.tsx`
- Modify: `apps/web/src/components/DeliveryConfig.tsx`
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/web/src/App.test.tsx`
- Modify: `apps/web/src/webhook.ts`
- Modify: `apps/web/src/webhook.test.ts`

**Interfaces:**
- Consumes: Task 1 v3 schema and envelope serializer.
- Produces: bidirectional form/raw state and ordered message×target delivery.

- [ ] Write failing UI/network tests for synchronization, strict invalid-state disabling, selected target restore, reorder buttons, and two-message ordered delivery.
- [ ] Run focused tests and confirm each new behavior is RED.
- [ ] Replace the active legacy editor with the v3 composer and route all delivery through serialized project messages.
- [ ] Run focused tests and the full workspace suite.

### Task 3: Executable samples and verification harness

**Files:**
- Create: `apps/web/src/code-samples.ts`
- Create: `apps/web/src/code-samples.test.ts`
- Create: `scripts/verify-live-messages.mjs`
- Modify: `apps/web/src/components/PayloadWorkbench.tsx`
- Modify: `package.json`

**Interfaces:**
- Consumes: strict envelope serialization.
- Produces: `makeCodeSamples(envelope, webhookUrl?)` and an environment-driven live support matrix.

- [ ] Write failing tests that execute/parse generated cURL and Bot SDK samples and reject the audited literal `+`/undefined `channel` regressions.
- [ ] Run focused tests and confirm RED.
- [ ] Implement generated samples and a secret-safe live verifier for webhook and authenticated bot modes.
- [ ] Run focused tests, dry-run verification, and the full workspace suite.

### Task 4: UX cleanup and responsive accessibility

**Files:**
- Modify: `apps/web/src/styles.css`
- Modify: `apps/web/src/mezon-theme.css`
- Modify: relevant component tests.

**Interfaces:**
- Consumes: Task 2 component structure.
- Produces: desktop 60/40 workspace, mobile tabs/sticky delivery, 44px targets, visible focus, readable type, and advanced progressive disclosure.

- [ ] Write failing semantic/interaction tests for one primary Send path, headings, disclosure, and accessible control names.
- [ ] Run tests and confirm RED.
- [ ] Consolidate CSS and implement the responsive layout using existing theme tokens.
- [ ] Verify unit tests plus browser sizes 375×812, 844×390, 768×1024, and 1440×900.

### Task 5: Documentation and live evidence

**Files:**
- Modify: `README.md`
- Modify: `docs/USAGE.md`
- Create: `docs/LIVE-VERIFICATION.md`
- Create: `llms.txt`

**Interfaces:**
- Consumes: Tasks 1–4 actual behavior and live verifier output.
- Produces: human and agent-readable support/usage documentation.

- [ ] Run the live webhook and bot matrices with real credentials and record markers/results without secrets.
- [ ] Reconcile README/usage with the implemented v3 workflow and known limits.
- [ ] Add stable agent-readable endpoint, schema, sample, and support-matrix content.
- [ ] Run secret scanning, the full test suite, production build, and final browser checks.

