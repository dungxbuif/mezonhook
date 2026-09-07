import { describe, expect, it } from 'vitest';

import {
  cloneProject,
  createAnnouncementDraft,
  createDraftFromTemplate,
  createWebhookProject,
  messageTemplates,
  normalizeProject,
  toMezonContent,
  validateDraft,
  validateProject,
} from '@mezonhook/schema';

describe('Mezon message schema', () => {
  it('creates a project with one editable message and one target slot', () => {
    const project = createWebhookProject();

    expect(project.messages).toHaveLength(1);
    expect(project.targets).toEqual([{ id: 'target-1', name: 'Mezon channel' }]);
  });

  it('normalizes nested untrusted project properties', () => {
    const project = createWebhookProject() as ReturnType<typeof createWebhookProject> & {
      webhookUrl?: string;
      messages: Array<ReturnType<typeof createAnnouncementDraft> & { card: ReturnType<typeof createAnnouncementDraft>['card'] & { extra?: string } }>;
    };
    project.webhookUrl = 'secret';
    project.messages[0].card.extra = 'discard';

    const normalized = normalizeProject(project);
    expect(normalized).not.toHaveProperty('webhookUrl');
    expect(normalized.messages[0].card).not.toHaveProperty('extra');
  });

  it('rejects project message and target bounds', () => {
    const project = createWebhookProject();
    project.messages = [];

    expect(validateProject(project).valid).toBe(false);
  });

  it('creates a detached editable project clone', () => {
    const original = createWebhookProject();
    const clone = cloneProject(original);
    clone.messages[0].card.title = 'Changed';

    expect(original.messages[0].card.title).toBe('Announcement');
  });

  it('exports an announcement as Mezon rich content', () => {
    const content = toMezonContent(createAnnouncementDraft());

    expect(content.embed[0].title).toBe('Announcement');
    expect(content.components[0].components[0].component.label).toBe('Learn more');
  });

  it('rejects a card with more than 25 fields', () => {
    const draft = createAnnouncementDraft();
    draft.card.fields = Array.from({ length: 26 }, () => ({
      name: 'N',
      value: 'V',
      inline: false,
    }));

    expect(validateDraft(draft).valid).toBe(false);
  });

  it('provides all three named templates as immutable defaults', () => {
    expect(messageTemplates.map((template) => template.name)).toEqual([
      'Announcement',
      'Release note',
      'Event invitation',
    ]);
    expect(Object.isFrozen(messageTemplates)).toBe(true);
    expect(Object.isFrozen(messageTemplates[0].draft.card)).toBe(true);
  });

  it('creates a fresh editable draft from a template', () => {
    const template = messageTemplates[0];
    const draft = createDraftFromTemplate(template.name);

    draft.card.title = 'Edited title';
    draft.buttons[0].label = 'Edited button';

    expect(template.draft.card.title).toBe('Announcement');
    expect(template.draft.buttons[0].label).toBe('Learn more');
  });

  it('accepts the five-button boundary', () => {
    const draft = createAnnouncementDraft();
    draft.buttons = Array.from({ length: 5 }, (_, index) => ({
      id: `button-${index}`,
      label: `Button ${index}`,
      style: 1,
    }));

    expect(validateDraft(draft).valid).toBe(true);
  });

  it('rejects malformed imported payloads without throwing', () => {
    expect(validateDraft({ card: null } as never)).toMatchObject({ valid: false });
  });

  it('rejects invalid text, URLs, and button styles', () => {
    const draft = createAnnouncementDraft();
    draft.card.title = '';
    draft.card.thumbnail = 'not-a-url';
    draft.buttons[0].style = 6 as never;

    expect(validateDraft(draft)).toMatchObject({ valid: false });
  });

  it('accepts the highest documented button style', () => {
    const draft = createAnnouncementDraft();
    draft.buttons[0].style = 5;

    expect(validateDraft(draft).valid).toBe(true);
  });

  it.each([0, 6])('rejects button style %i', (style) => {
    const draft = createAnnouncementDraft();
    draft.buttons[0].style = style as never;

    expect(validateDraft(draft).valid).toBe(false);
  });

  it('exports a detached Mezon content snapshot', () => {
    const draft = createAnnouncementDraft();
    draft.card.fields = [{ name: 'Before', value: 'Value', inline: false }];
    const content = toMezonContent(draft);

    content.embed[0].title = 'Changed export';
    content.embed[0].fields[0].name = 'Changed field';

    expect(draft.card.title).toBe('Announcement');
    expect(draft.card.fields[0].name).toBe('Before');
  });
});
