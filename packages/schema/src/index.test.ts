import { describe, expect, it } from 'vitest';

import {
  createAnnouncementDraft,
  createDraftFromTemplate,
  messageTemplates,
  toMezonContent,
  validateDraft,
} from '@mezonhook/schema';

describe('Mezon message schema', () => {
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
