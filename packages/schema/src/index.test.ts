import { describe, expect, it } from 'vitest';

import { createAnnouncementDraft, toMezonContent, validateDraft } from './index';

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
});
