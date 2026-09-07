import { createAnnouncementDraft } from '@mezonhook/schema';
import { beforeEach, describe, expect, it } from 'vitest';
import { DRAFT_STORAGE_KEY, importDraftJson, readStoredDraft, saveDraft } from './draft-storage';

describe('local draft storage', () => {
  beforeEach(() => localStorage.clear());

  // Mutation caught: drafts are stored under an unversioned key or secret-bearing envelope.
  it('saves a valid draft under the versioned key only', () => {
    const draft = createAnnouncementDraft();

    expect(saveDraft(draft)).toEqual({ ok: true });
    expect(localStorage.getItem(DRAFT_STORAGE_KEY)).toBe(JSON.stringify(draft));
  });

  // Mutation caught: malformed or invalid stored data can escape into the editor state.
  it('returns an error instead of throwing for malformed or invalid stored JSON', () => {
    localStorage.setItem(DRAFT_STORAGE_KEY, '{bad JSON');
    expect(readStoredDraft()).toMatchObject({ ok: false });

    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ body: '' }));
    expect(readStoredDraft()).toMatchObject({ ok: false });
  });

  // Mutation caught: imported JSON bypasses schema validation.
  it('imports only a schema-valid MessageDraft JSON document', () => {
    const draft = createAnnouncementDraft();
    expect(importDraftJson(JSON.stringify(draft))).toEqual({ ok: true, draft });
    expect(importDraftJson('{bad JSON')).toMatchObject({ ok: false });
    expect(importDraftJson(JSON.stringify({ body: '' }))).toMatchObject({ ok: false });
  });
});
