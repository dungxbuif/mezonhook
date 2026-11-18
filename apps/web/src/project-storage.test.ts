import { createAnnouncementDraft, createChannelWebhookProject, createWebhookProject } from '@mezonhook/schema';
import { beforeEach, describe, expect, it } from 'vitest';
import { DRAFT_STORAGE_KEY } from './draft-storage';
import { PROJECT_STORAGE_KEY, importProjectJson, readStoredProject, saveProject } from './project-storage';

describe('project storage', () => {
  beforeEach(() => localStorage.clear());
  it('migrates the v1 draft into a one-message project', () => {
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(createAnnouncementDraft()));
    expect(readStoredProject()).toMatchObject({ ok: true, project: { version: 3, messages: [{ t: 'Hello everyone!' }] } });
  });
  it('migrates a version 2 rich project to webhook-only version 3 data', () => {
    const legacy = createWebhookProject();
    legacy.messages[0].body = 'Legacy body';
    legacy.messages[0].card.title = 'Must not survive';
    legacy.messages[0].buttons[0].label = 'Must not survive';

    const imported = importProjectJson(JSON.stringify(legacy));

    expect(imported).toEqual({
      ok: true,
      project: {
        version: 3,
        name: legacy.name,
        messages: [{ t: 'Legacy body', mk: [], mentions: [], images: [], hg: [] }],
        targets: legacy.targets,
      },
    });
  });
  it('does not persist imported webhook URLs', () => {
    const imported = importProjectJson(JSON.stringify({ ...createChannelWebhookProject(), webhookUrl: 'secret' }));
    expect(imported.ok && imported.project).not.toHaveProperty('webhookUrl');
    if (imported.ok && imported.project) saveProject(imported.project);
    expect(localStorage.getItem(PROJECT_STORAGE_KEY)).not.toContain('secret');
  });
});
