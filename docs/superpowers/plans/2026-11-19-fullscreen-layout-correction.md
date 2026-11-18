# Fullscreen Layout Correction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the broken nested desktop scroll layout and give fresh webhook projects useful message and target defaults.

**Architecture:** Keep the existing React component hierarchy and 60/40 desktop grid, but move vertical scrolling from fixed-height panes back to the document and make the desktop preview sticky. Change only the schema factory defaults so persisted and imported projects remain untouched.

**Tech Stack:** TypeScript, React 19, CSS Grid, Vite, Vitest, Testing Library, Playwright CLI.

**Spec:** `docs/superpowers/specs/2026-11-19-reliable-composer-and-live-verification-design.md`

## Global Constraints

- Fresh message text is exactly `Deployment completed successfully.`.
- Fresh target name is exactly `Production alerts`.
- Stored and imported projects retain their values.
- Desktop uses natural document scrolling with a sticky preview; mobile/tablet tabs use normal flow.
- No horizontal document overflow from 320px through 1920px.

## Review Focus

- A persisted v3 project must not be replaced by the new defaults.
- Target labels and webhook accessible names must update with the default target name.
- Sticky preview must not overlap the 56px top bar or exceed the viewport.
- The 1000px tab breakpoint must not leave hidden panes sticky or fixed-height.
- Long optional-field collections must extend the document without creating nested pane scrolling.

---

### Task 1: Fresh project defaults

**Files:**
- Modify: `packages/schema/src/index.test.ts`
- Modify: `packages/schema/src/index.ts`
- Modify: `apps/web/src/App.test.tsx`

**Interfaces:**
- Produces: `createChannelWebhookMessage(text?: string)` and `createChannelWebhookProject()` with the approved fresh defaults.
- Consumes: existing storage restoration, which remains unchanged.

- [ ] **Step 1: Write failing default tests** asserting the exact fresh message and target strings, plus the existing stored-project preservation behavior.
- [ ] **Step 2: Run focused schema and web tests** and confirm failures show the old `Hello from MezonHook!` / `Mezon channel` values.
- [ ] **Step 3: Change the factory literals** in `packages/schema/src/index.ts` without adding migration or storage rewrites.
- [ ] **Step 4: Run focused tests** and confirm the new defaults pass while stored-project restoration remains green.

### Task 2: Natural-scroll desktop layout

**Files:**
- Modify: `apps/web/src/styles.css`
- Test: `apps/web/src/layout-contract.test.ts`

**Interfaces:**
- Consumes: existing `.workspace-shell`, `.composer-layout`, `.pane-scroll`, and responsive tab classes.
- Produces: a document-scrolling desktop grid and a preview positioned below the sticky header.

- [ ] **Step 1: Add a failing CSS contract test** that rejects desktop `height: 100vh`, `overflow: hidden`, and `.pane-scroll` vertical scrolling, and requires a sticky desktop preview offset by the top bar.
- [ ] **Step 2: Run the focused CSS contract test** and confirm it fails against the fixed-height implementation.
- [ ] **Step 3: Make the minimal CSS changes** for natural page height, visible pane overflow, and desktop sticky preview; explicitly reset sticky positioning below 1000px.
- [ ] **Step 4: Run web tests and the production build** to catch semantic or compilation regressions.

### Task 3: Documentation and production verification

**Files:**
- Modify: `README.md`
- Modify: `docs/USAGE.md`
- Modify: `llms.txt`

**Interfaces:**
- Consumes: Tasks 1–2 shipped behavior.
- Produces: human and agent-readable descriptions of fresh defaults and responsive layout behavior.

- [ ] **Step 1: Reconcile public docs** with the exact defaults and natural-scroll/sticky-preview workflow.
- [ ] **Step 2: Run the complete test suite and production build** under the repository-supported Node version.
- [ ] **Step 3: Verify Chromium viewports** at 375×812, 844×390, 768×1024, 1440×900, and 1920×1080; capture evidence and assert no horizontal overflow.
- [ ] **Step 4: Merge to `main`, create the next owner source tag, monitor both app and ops pipelines, then repeat the viewport checks on production.**
