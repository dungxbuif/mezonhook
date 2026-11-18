import {
  createChannelWebhookProject,
  createWebhookProject,
  type WebhookProject,
} from '@mezonhook/schema';
import { beforeEach, describe, expect, it } from 'vitest';
import { DRAFT_STORAGE_KEY } from './draft-storage';
import {
  BOT_PROJECT_STORAGE_KEY,
  COMPOSER_MODE_STORAGE_KEY,
  importComposerProject,
  readComposerState,
  saveBotProject,
  saveComposerMode,
} from './composer-storage';
import { PROJECT_STORAGE_KEY, saveProject } from './project-storage';

const richBotProject = (): WebhookProject => {
  const project = createWebhookProject();
  project.name = 'Interactive bot project';
  project.messages[0].card.fields = [{
    name: 'Reason',
    value: 'Tell us what happened',
    inline: false,
    inputs: {
      id: 'reason-field',
      type: 3,
      component: {
        id: 'reason-input',
        placeholder: 'Write a short explanation',
        defaultValue: 'Planned maintenance',
        type: 'text',
        textarea: true,
        disabled: false,
      },
    },
  }];
  return project;
};

describe('dual composer storage', () => {
  beforeEach(() => localStorage.clear());

  it('routes version 2 imports to bot without dropping interactive inputs', () => {
    const source = richBotProject();
    const imported = importComposerProject(JSON.stringify(source));

    expect(imported).toEqual({ ok: true, mode: 'bot', project: source });
    if (!imported.ok || imported.mode !== 'bot') throw new Error('Expected a Bot SDK import.');
    expect(saveBotProject(imported.project)).toEqual({ ok: true, project: source });
    expect(readComposerState().bot).toEqual(source);
  });

  it('routes version 3 imports to webhook without mutation', () => {
    const source = createChannelWebhookProject();
    source.name = 'Production hooks';
    source.messages[0].mk = [{ type: 'pre', s: 0, e: 4 }];

    expect(importComposerProject(JSON.stringify(source))).toEqual({ ok: true, mode: 'webhook', project: source });
  });

  it('restores both projects independently and honors the saved mode', () => {
    const webhook = createChannelWebhookProject();
    webhook.name = 'Stored webhook';
    const bot = richBotProject();
    saveProject(webhook);
    saveBotProject(bot);
    saveComposerMode('bot');

    expect(readComposerState()).toEqual({ mode: 'bot', webhook, bot, errors: [] });
  });

  it('prefers bot only when legacy data exists without version 3 data', () => {
    const legacyDraft = richBotProject().messages[0];
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(legacyDraft));

    const state = readComposerState();

    expect(state.mode).toBe('bot');
    expect(state.bot.messages[0]).toEqual(legacyDraft);
    expect(state.bot.messages[0].card.fields[0].inputs).toEqual(legacyDraft.card.fields[0].inputs);
    expect(localStorage.getItem(PROJECT_STORAGE_KEY)).toBeNull();
  });

  it('keeps valid state when the other stored project is malformed', () => {
    const webhook = createChannelWebhookProject();
    webhook.name = 'Still valid';
    saveProject(webhook);
    localStorage.setItem(BOT_PROJECT_STORAGE_KEY, '{"version":2,"messages":"broken"}');
    localStorage.setItem(COMPOSER_MODE_STORAGE_KEY, 'bot');

    const state = readComposerState();

    expect(state.webhook).toEqual(webhook);
    expect(state.bot).toEqual(createWebhookProject());
    expect(state.mode).toBe('webhook');
    expect(state.errors).toHaveLength(1);
    expect(localStorage.getItem(BOT_PROJECT_STORAGE_KEY)).toBe('{"version":2,"messages":"broken"}');
  });
});
