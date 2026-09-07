import { createAnnouncementDraft, createWebhookProject } from '@mezonhook/schema';
import { beforeEach, describe, expect, it } from 'vitest';
import { DRAFT_STORAGE_KEY } from './draft-storage';
import { PROJECT_STORAGE_KEY, importProjectJson, readStoredProject, saveProject } from './project-storage';

describe('project storage', () => {
  beforeEach(() => localStorage.clear());
  it('migrates the v1 draft into a one-message project', () => {
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(createAnnouncementDraft()));
    expect(readStoredProject()).toMatchObject({ ok: true, project: { version: 2, messages: [expect.any(Object)] } });
  });
  it('does not persist imported webhook URLs', () => {
    const imported = importProjectJson(JSON.stringify({ ...createWebhookProject(), webhookUrl: 'secret' }));
    expect(imported.ok && imported.project).not.toHaveProperty('webhookUrl');
    if (imported.ok && imported.project) saveProject(imported.project);
    expect(localStorage.getItem(PROJECT_STORAGE_KEY)).not.toContain('secret');
  });
});
