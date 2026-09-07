export type InteractiveInputType = 2 | 3 | 4 | 5 | 6;

export interface SelectFieldOption {
  label: string;
  value: string;
}

export interface RadioFieldOption extends SelectFieldOption {
  name?: string;
  description?: string;
  style?: MessageButtonStyle;
  disabled?: boolean;
}

export interface InputFieldInputs {
  id: string;
  type: 3;
  component: {
    id: string;
    placeholder?: string;
    defaultValue?: string | number;
    type?: string;
    textarea?: boolean;
    disabled?: boolean;
  };
}

export interface SelectFieldInputs {
  id: string;
  type: 2;
  component: {
    options: SelectFieldOption[];
    valueSelected?: string;
  };
}

export interface RadioFieldInputs {
  id: string;
  type: 5;
  component: RadioFieldOption[];
  max_options?: number;
}

export interface DatePickerFieldInputs {
  id: string;
  type: 4;
  component: Record<string, never>;
}

export interface AnimationFieldInputs {
  id: string;
  type: 6;
  component: {
    url_image: string;
    url_position: string;
    pool: string[];
    repeat?: number;
    duration?: number;
  };
}

export type MessageFieldInputs = InputFieldInputs | SelectFieldInputs | RadioFieldInputs | DatePickerFieldInputs | AnimationFieldInputs;

export interface MessageField {
  name: string;
  value: string;
  inline: boolean;
  inputs?: MessageFieldInputs;
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

function cloneFieldInputs(inputs: MessageFieldInputs | undefined): MessageFieldInputs | undefined {
  if (!inputs || !isRecord(inputs) || typeof inputs.id !== 'string') return undefined;

  if (inputs.type === 3 && isRecord(inputs.component) && typeof inputs.component.id === 'string') {
    const component = inputs.component;
    return {
      id: inputs.id,
      type: 3,
      component: {
        id: component.id,
        ...(typeof component.placeholder === 'string' ? { placeholder: component.placeholder } : {}),
        ...(typeof component.defaultValue === 'string' || typeof component.defaultValue === 'number' ? { defaultValue: component.defaultValue } : {}),
        ...(typeof component.type === 'string' ? { type: component.type } : {}),
        ...(typeof component.textarea === 'boolean' ? { textarea: component.textarea } : {}),
        ...(typeof component.disabled === 'boolean' ? { disabled: component.disabled } : {}),
      },
    };
  }

  if (inputs.type === 2 && isRecord(inputs.component) && Array.isArray(inputs.component.options)) {
    return {
      id: inputs.id,
      type: 2,
      component: {
        options: inputs.component.options.filter(isRecord).map((option) => ({
          label: typeof option.label === 'string' ? option.label : '',
          value: typeof option.value === 'string' ? option.value : '',
        })),
        ...(typeof inputs.component.valueSelected === 'string' ? { valueSelected: inputs.component.valueSelected } : {}),
      },
    };
  }

  if (inputs.type === 5 && Array.isArray(inputs.component)) {
    return {
      id: inputs.id,
      type: 5,
      component: inputs.component.filter(isRecord).map((option) => ({
        label: typeof option.label === 'string' ? option.label : '',
        value: typeof option.value === 'string' ? option.value : '',
        ...(typeof option.name === 'string' ? { name: option.name } : {}),
        ...(typeof option.description === 'string' ? { description: option.description } : {}),
        ...([1, 2, 3, 4, 5].includes(option.style as number) ? { style: option.style as MessageButtonStyle } : {}),
        ...(typeof option.disabled === 'boolean' ? { disabled: option.disabled } : {}),
      })),
      ...(Number.isInteger(inputs.max_options) ? { max_options: inputs.max_options } : {}),
    };
  }

  if (inputs.type === 4 && isRecord(inputs.component)) {
    return { id: inputs.id, type: 4, component: {} };
  }

  if (inputs.type === 6 && isRecord(inputs.component) && Array.isArray(inputs.component.pool)) {
    const component = inputs.component;
    return {
      id: inputs.id,
      type: 6,
      component: {
        url_image: typeof component.url_image === 'string' ? component.url_image : '',
        url_position: typeof component.url_position === 'string' ? component.url_position : '',
        pool: component.pool.filter((entry): entry is string => typeof entry === 'string'),
        ...(typeof component.repeat === 'number' && Number.isFinite(component.repeat) ? { repeat: component.repeat } : {}),
        ...(typeof component.duration === 'number' && Number.isFinite(component.duration) ? { duration: component.duration } : {}),
      },
    };
  }

  return undefined;
}

function cloneField(field: MessageField): MessageField {
  const inputs = cloneFieldInputs(field.inputs);
  return {
    name: field.name,
    value: field.value,
    inline: typeof field.inline === 'boolean' ? field.inline : false,
    ...(inputs ? { inputs } : {}),
  };
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
      fields: draft.card.fields.map(cloneField),
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

const isFiniteNonNegativeNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

const isOptionalStringWithin = (value: unknown, maxLength: number): boolean =>
  value === undefined || isStringWithin(value, maxLength);

const isOptionalBoolean = (value: unknown): boolean => value === undefined || typeof value === 'boolean';

function isSelectOption(value: unknown): value is SelectFieldOption {
  return isRecord(value)
    && isStringWithin(value.label, 100, true)
    && isStringWithin(value.value, 100, true);
}

function isRadioOption(value: unknown): value is RadioFieldOption {
  if (!isRecord(value) || !isSelectOption(value)) return false;

  return isOptionalStringWithin(value.name, 100)
    && isOptionalStringWithin(value.description, 1_024)
    && (value.style === undefined || [1, 2, 3, 4, 5].includes(value.style as number))
    && isOptionalBoolean(value.disabled);
}

function isDocumentedFieldInputs(value: unknown): value is MessageFieldInputs {
  if (!isRecord(value) || !isStringWithin(value.id, 100, true)) return false;

  if (value.type === 3) {
    return isRecord(value.component)
      && isStringWithin(value.component.id, 100, true)
      && isOptionalStringWithin(value.component.placeholder, 256)
      && (value.component.defaultValue === undefined || typeof value.component.defaultValue === 'string' || typeof value.component.defaultValue === 'number')
      && isOptionalStringWithin(value.component.type, 32)
      && isOptionalBoolean(value.component.textarea)
      && isOptionalBoolean(value.component.disabled);
  }

  if (value.type === 2) {
    return isRecord(value.component)
      && Array.isArray(value.component.options)
      && value.component.options.every(isSelectOption)
      && isOptionalStringWithin(value.component.valueSelected, 100);
  }

  if (value.type === 5) {
    return Array.isArray(value.component)
      && value.component.every(isRadioOption)
      && (value.max_options === undefined || (Number.isInteger(value.max_options) && (value.max_options as number) > 0 && (value.max_options as number) <= value.component.length));
  }

  if (value.type === 4) return isRecord(value.component);

  if (value.type === 6) {
    return isRecord(value.component)
      && isStringWithin(value.component.url_image, 2_048, true)
      && isStringWithin(value.component.url_position, 2_048, true)
      && Array.isArray(value.component.pool)
      && value.component.pool.every((entry) => isStringWithin(entry, 2_048, true))
      && (value.component.repeat === undefined || isFiniteNonNegativeNumber(value.component.repeat))
      && (value.component.duration === undefined || isFiniteNonNegativeNumber(value.component.duration));
  }

  return false;
}

function isValidCardField(field: unknown): boolean {
  if (!isRecord(field)) return false;
  const interactive = field.inputs !== undefined;

  return isStringWithin(field.name, 256, !interactive)
    && isStringWithin(field.value, 1_024, !interactive)
    && (typeof field.inline === 'boolean' || (interactive && field.inline === undefined))
    && (!interactive || isDocumentedFieldInputs(field.inputs));
}

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
  } else if (card.fields.some((field) => !isValidCardField(field))) {
    errors.push('Each card field must use documented content or interactive input fields.');
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
  const normalized = cloneDraft(draft);
  return {
    t: normalized.body,
    embed: [{
      ...normalized.card,
      fields: normalized.card.fields.map(cloneField),
    }],
    components: [
      {
        type: 1,
        components: normalized.buttons.map((button) => ({
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
