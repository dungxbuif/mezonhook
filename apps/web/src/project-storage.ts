import { createWebhookProject, normalizeProject, type WebhookProject, validateProject } from '@mezonhook/schema';
import { readStoredDraft } from './draft-storage';

export const PROJECT_STORAGE_KEY = 'mezonhook:project:v2';

export type ProjectStorageResult = { ok: true; project: WebhookProject } | { ok: false; error: string };

function validProject(value: unknown): ProjectStorageResult {
  const validation = validateProject(value);
  return validation.valid
    ? { ok: true, project: normalizeProject(value as WebhookProject) }
    : { ok: false, error: validation.errors.join(' ') };
}

export function importProjectJson(text: string): ProjectStorageResult {
  try { return validProject(JSON.parse(text)); } catch { return { ok: false, error: 'The selected file is not valid JSON.' }; }
}

export function saveProject(project: WebhookProject): ProjectStorageResult {
  const result = validProject(project);
  if (!result.ok) return result;
  try { localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(result.project)); return result; }
  catch { return { ok: false, error: 'The browser could not save this project locally.' }; }
}

export function readStoredProject(): ProjectStorageResult {
  try {
    const saved = localStorage.getItem(PROJECT_STORAGE_KEY);
    if (saved !== null) return importProjectJson(saved);
    const legacy = readStoredDraft();
    if (legacy.ok && legacy.draft) {
      const project = createWebhookProject();
      project.messages = [legacy.draft];
      return validProject(project);
    }
    return { ok: false, error: 'No saved project was found.' };
  } catch { return { ok: false, error: 'The browser could not read the saved project.' }; }
}
