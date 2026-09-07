export interface MessageField {
  name: string;
  value: string;
  inline: boolean;
}

export type MessageButtonStyle = 1 | 2 | 3 | 4 | 5;

export interface MessageButton {
  id: string;
  label: string;
  style: MessageButtonStyle;
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
  draft: ReadonlyMessageDraft;
}

export interface WebhookTarget {
  id: string;
  name: string;
}

export interface WebhookProject {
  version: 2;
  name: string;
  messages: MessageDraft[];
  targets: WebhookTarget[];
}

export interface ReadonlyMessageDraft {
  readonly body: string;
  readonly card: Omit<Readonly<MessageCard>, 'fields'> & {
    readonly fields: readonly Readonly<MessageField>[];
  };
  readonly buttons: readonly Readonly<MessageButton>[];
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

function cloneDraft(draft: ReadonlyMessageDraft): MessageDraft {
  return {
    body: draft.body,
    card: {
      color: draft.card.color,
      title: draft.card.title,
      description: draft.card.description,
      author: draft.card.author,
      thumbnail: draft.card.thumbnail,
      image: draft.card.image,
      fields: draft.card.fields.map((field) => ({ name: field.name, value: field.value, inline: field.inline })),
    },
    buttons: draft.buttons.map((button) => ({ id: button.id, label: button.label, style: button.style })),
  };
}

export function createMessageId(position: number): string {
  return `message-${position}`;
}

export function createTargetId(position: number): string {
  return `target-${position}`;
}

export function createWebhookProject(): WebhookProject {
  return {
    version: 2,
    name: 'Untitled webhook project',
    messages: [createAnnouncementDraft()],
    targets: [{ id: createTargetId(1), name: 'Mezon channel' }],
  };
}

export function cloneProject(project: WebhookProject): WebhookProject {
  return {
    version: 2,
    name: project.name,
    messages: project.messages.map((message) => cloneDraft(message)),
    targets: project.targets.map((target) => ({ id: target.id, name: target.name })),
  };
}

export function normalizeProject(project: WebhookProject): WebhookProject {
  return cloneProject(project);
}

function freezeTemplate(name: string, draft: MessageDraft): MessageTemplate {
  const frozenDraft = Object.freeze({
    ...draft,
    card: Object.freeze({
      ...draft.card,
      fields: Object.freeze(draft.card.fields.map((field) => Object.freeze({ ...field }))),
    }),
    buttons: Object.freeze(draft.buttons.map((button) => Object.freeze({ ...button }))),
  });

  return Object.freeze({ name, draft: frozenDraft });
}

export const messageTemplates: readonly MessageTemplate[] = Object.freeze([
  freezeTemplate('Announcement', createAnnouncementDraft()),
  freezeTemplate('Release note', createDraft('Release note', 'What changed in this release.', 'A new release is available!')),
  freezeTemplate('Event invitation', createDraft('Event invitation', 'Join us for an upcoming event.', 'You are invited!')),
]);

export function createDraftFromTemplate(name: string): MessageDraft {
  const template = messageTemplates.find((candidate) => candidate.name === name);

  if (!template) {
    throw new Error(`Unknown message template: ${name}`);
  }

  return cloneDraft(template.draft);
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isStringWithin = (value: unknown, maxLength: number, required = false): boolean =>
  typeof value === 'string' && (required ? value.trim().length > 0 : true) && value.length <= maxLength;

const isHttpUrl = (value: unknown): boolean => {
  if (value === '') return true;
  if (typeof value !== 'string') return false;

  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

export function validateDraft(draft: unknown): ValidationResult {
  const errors: string[] = [];

  if (!isRecord(draft)) {
    return { valid: false, errors: ['Draft must be an object.'] };
  }

  if (!isStringWithin(draft.body, 2_000, true)) {
    errors.push('Body is required and must be 2,000 characters or fewer.');
  }

  if (!isRecord(draft.card)) {
    return { valid: false, errors: [...errors, 'Card must be an object.'] };
  }

  const card = draft.card;
  if (typeof card.color !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(card.color)) {
    errors.push('Card color must be a hex color.');
  }
  if (!isStringWithin(card.title, 256, true)) {
    errors.push('Card title is required and must be 256 characters or fewer.');
  }
  if (!isStringWithin(card.description, 4_096, true)) {
    errors.push('Card description is required and must be 4,096 characters or fewer.');
  }
  if (!isStringWithin(card.author, 256)) {
    errors.push('Card author must be 256 characters or fewer.');
  }
  if (!isHttpUrl(card.thumbnail) || !isHttpUrl(card.image)) {
    errors.push('Card thumbnail and image must be HTTP(S) URLs when provided.');
  }
  if (!Array.isArray(card.fields)) {
    errors.push('Card fields must be an array.');
  } else if (card.fields.length > 25) {
    errors.push('A card can have at most 25 fields.');
  } else if (card.fields.some((field) => !isRecord(field)
    || !isStringWithin(field.name, 256, true)
    || !isStringWithin(field.value, 1_024, true)
    || typeof field.inline !== 'boolean')) {
    errors.push('Each card field must have a name, value, and inline flag.');
  }

  if (!Array.isArray(draft.buttons)) {
    errors.push('Buttons must be an array.');
  } else if (draft.buttons.length > 5) {
    errors.push('A message can have at most 5 buttons.');
  } else if (draft.buttons.some((button) => !isRecord(button)
    || !isStringWithin(button.id, 100, true)
    || !isStringWithin(button.label, 80, true)
    || ![1, 2, 3, 4, 5].includes(button.style as number))) {
    errors.push('Each button must have a valid id, label, and style.');
  }

  return { valid: errors.length === 0, errors };
}

export function validateProject(project: unknown): ValidationResult {
  if (!isRecord(project)) return { valid: false, errors: ['Project must be an object.'] };

  const errors: string[] = [];
  if (project.version !== 2) errors.push('Project version must be 2.');
  if (!isStringWithin(project.name, 100, true)) errors.push('Project name is required and must be 100 characters or fewer.');
  if (!Array.isArray(project.messages) || project.messages.length < 1 || project.messages.length > 20) {
    errors.push('A project must have between 1 and 20 messages.');
  } else if (project.messages.some((message) => !validateDraft(message).valid)) {
    errors.push('Every project message must be valid.');
  }

  if (!Array.isArray(project.targets) || project.targets.length < 1 || project.targets.length > 10) {
    errors.push('A project must have between 1 and 10 targets.');
  } else {
    const ids = new Set<string>();
    for (const target of project.targets) {
      if (!isRecord(target) || typeof target.id !== 'string' || typeof target.name !== 'string'
        || !isStringWithin(target.id, 100, true) || !isStringWithin(target.name, 100, true)) {
        errors.push('Each target must have an id and name of 100 characters or fewer.');
        break;
      }
      if (ids.has(target.id)) {
        errors.push('Target IDs must be unique.');
        break;
      }
      ids.add(target.id);
    }
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
        style: MessageButtonStyle;
      };
    }>;
  }>;
}

export function toMezonContent(draft: MessageDraft): MezonContent {
  return {
    t: draft.body,
    embed: [{
      ...draft.card,
      fields: draft.card.fields.map((field) => ({ ...field })),
    }],
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
