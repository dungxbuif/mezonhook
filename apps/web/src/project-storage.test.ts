import { createChannelWebhookProject, createWebhookProject } from '@mezonhook/schema';
import { beforeEach, describe, expect, it } from 'vitest';
import { PROJECT_STORAGE_KEY, importProjectJson, readStoredProject, saveProject } from './project-storage';

describe('project storage', () => {
  beforeEach(() => localStorage.clear());
  it('does not coerce version 2 Bot SDK data into version 3 webhook data', () => {
    expect(importProjectJson(JSON.stringify(createWebhookProject()))).toEqual({
      ok: false,
      error: expect.stringContaining('version must be 3'),
    });
  });
  it('reads only the version 3 webhook storage key', () => {
    const project = createChannelWebhookProject();
    saveProject(project);
    expect(readStoredProject()).toEqual({ ok: true, project });
  });
  it('does not persist imported webhook URLs', () => {
    const imported = importProjectJson(JSON.stringify({ ...createChannelWebhookProject(), webhookUrl: 'secret' }));
    expect(imported.ok && imported.project).not.toHaveProperty('webhookUrl');
    if (imported.ok && imported.project) saveProject(imported.project);
    expect(localStorage.getItem(PROJECT_STORAGE_KEY)).not.toContain('secret');
  });
});
