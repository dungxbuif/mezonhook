export interface MessageField {
  name: string;
  value: string;
  inline: boolean;
}

export interface MessageButton {
  id: string;
  label: string;
  style: number;
}

export interface MessageCard {
  color: string;
  title: string;
  description: string;
  author: string;
  thumbnail: string;
  image: string;
  fields: MessageField[];
}

export interface MessageDraft {
  body: string;
  card: MessageCard;
  buttons: MessageButton[];
}

export interface MessageTemplate {
  name: string;
  draft: MessageDraft;
}

function createDraft(
  title: string,
  description: string,
  body: string,
): MessageDraft {
  return {
    body,
    card: {
      color: '#5865F2',
      title,
      description,
      author: '',
      thumbnail: '',
      image: '',
      fields: [],
    },
    buttons: [{ id: 'learn-more', label: 'Learn more', style: 1 }],
  };
}

export function createAnnouncementDraft(): MessageDraft {
  return createDraft('Announcement', 'Share an important update.', 'Hello everyone!');
}

export const messageTemplates: MessageTemplate[] = [
  { name: 'Announcement', draft: createAnnouncementDraft() },
  {
    name: 'Release note',
    draft: createDraft('Release note', 'What changed in this release.', 'A new release is available!'),
  },
  {
    name: 'Event invitation',
    draft: createDraft('Event invitation', 'Join us for an upcoming event.', 'You are invited!'),
  },
];

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateDraft(draft: MessageDraft): ValidationResult {
  const errors: string[] = [];

  if (draft.card.fields.length > 25) {
    errors.push('A card can have at most 25 fields.');
  }

  if (draft.buttons.length > 5) {
    errors.push('A message can have at most 5 buttons.');
  }

  return { valid: errors.length === 0, errors };
}

export interface MezonContent {
  t: string;
  embed: MessageCard[];
  components: Array<{
    type: 1;
    components: Array<{
      id: string;
      type: 1;
      component: {
        label: string;
        style: number;
      };
    }>;
  }>;
}

export function toMezonContent(draft: MessageDraft): MezonContent {
  return {
    t: draft.body,
    embed: [draft.card],
    components: [
      {
        type: 1,
        components: draft.buttons.map((button) => ({
          id: button.id,
          type: 1,
          component: {
            label: button.label,
            style: button.style,
          },
        })),
      },
    ],
  };
}
