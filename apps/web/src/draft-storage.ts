import { type MessageDraft, validateDraft } from '@mezonhook/schema';

export const DRAFT_STORAGE_KEY = 'mezonhook:draft:v1';

export type DraftStorageResult =
  | { ok: true; draft?: MessageDraft }
  | { ok: false; error: string };

export type SaveDraftResult =
  | { ok: true }
  | { ok: false; error: string };

export function normalizeDraft(draft: MessageDraft): MessageDraft {
  return {
    body: draft.body,
    card: {
      color: draft.card.color,
      title: draft.card.title,
      description: draft.card.description,
      author: draft.card.author,
      thumbnail: draft.card.thumbnail,
      image: draft.card.image,
      fields: draft.card.fields.map((field) => ({
        name: field.name,
        value: field.value,
        inline: field.inline,
      })),
    },
    buttons: draft.buttons.map((button) => ({
      id: button.id,
      label: button.label,
      style: button.style,
    })),
  };
}

function validDraftResult(value: unknown): DraftStorageResult {
  const validation = validateDraft(value);
  if (!validation.valid) return { ok: false, error: validation.errors.join(' ') };
  return { ok: true, draft: normalizeDraft(value as MessageDraft) };
}

export function importDraftJson(text: string): DraftStorageResult {
  try {
    return validDraftResult(JSON.parse(text));
  } catch {
    return { ok: false, error: 'The selected file is not valid JSON.' };
  }
}

export function saveDraft(draft: MessageDraft): SaveDraftResult {
  const validation = validateDraft(draft);
  if (!validation.valid) return { ok: false, error: validation.errors.join(' ') };

  try {
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(normalizeDraft(draft)));
    return { ok: true };
  } catch {
    return { ok: false, error: 'The browser could not save this draft locally.' };
  }
}

export function readStoredDraft(): DraftStorageResult {
  try {
    const text = localStorage.getItem(DRAFT_STORAGE_KEY);
    return text === null ? { ok: false, error: 'No saved draft was found.' } : importDraftJson(text);
  } catch {
    return { ok: false, error: 'The browser could not read the saved draft.' };
  }
}
