import {
  cloneChannelWebhookProject,
  type ChannelWebhookProject,
  validateChannelWebhookProject,
} from '@mezonhook/schema';

export const PROJECT_STORAGE_KEY = 'mezonhook:project:v3';

export type ProjectStorageResult<T = ChannelWebhookProject> = { ok: true; project: T } | { ok: false; error: string };

function validProject(value: unknown): ProjectStorageResult {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { ok: false, error: 'Project must be an object.' };
  const input = value as Record<string, unknown>;
  const candidate = {
    version: input.version,
    name: input.name,
    messages: input.messages,
    targets: input.targets,
  };
  const validation = validateChannelWebhookProject(candidate);
  return validation.valid
    ? { ok: true, project: cloneChannelWebhookProject(candidate as ChannelWebhookProject) }
    : { ok: false, error: validation.errors.join(' ') };
}

export function importProjectJson(text: string): ProjectStorageResult {
  try {
    const value: unknown = JSON.parse(text);
    return validProject(value);
  } catch { return { ok: false, error: 'The selected file is not valid JSON.' }; }
}

export function saveProject(project: ChannelWebhookProject): ProjectStorageResult {
  const result = validProject(project);
  if (!result.ok) return result;
  try { localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(result.project)); return result; }
  catch { return { ok: false, error: 'The browser could not save this project locally.' }; }
}

export function readStoredProject(): ProjectStorageResult {
  try {
    const saved = localStorage.getItem(PROJECT_STORAGE_KEY);
    if (saved !== null) return importProjectJson(saved);
    return { ok: false, error: 'No saved project was found.' };
  } catch { return { ok: false, error: 'The browser could not read the saved project.' }; }
}
