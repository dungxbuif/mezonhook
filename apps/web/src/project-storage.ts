import {
  cloneChannelWebhookProject,
  createChannelWebhookMessage,
  createChannelWebhookProject,
  type ChannelWebhookProject,
  validateChannelWebhookProject,
} from '@mezonhook/schema';
import { readStoredDraft } from './draft-storage';

export const PROJECT_STORAGE_KEY = 'mezonhook:project:v3';
const LEGACY_PROJECT_STORAGE_KEY = 'mezonhook:project:v2';

export type ProjectStorageResult = { ok: true; project: ChannelWebhookProject } | { ok: false; error: string };

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

function migrateLegacyProject(value: Record<string, unknown>): ProjectStorageResult | null {
  if (value.version !== 2 || !Array.isArray(value.messages) || !Array.isArray(value.targets)) return null;
  const project = createChannelWebhookProject();
  project.name = typeof value.name === 'string' ? value.name : project.name;
  project.messages = value.messages.map((message) => createChannelWebhookMessage(
    message && typeof message === 'object' && typeof (message as Record<string, unknown>).body === 'string'
      ? (message as Record<string, unknown>).body as string
      : '',
  ));
  project.targets = value.targets
    .filter((target): target is Record<string, unknown> => Boolean(target) && typeof target === 'object' && !Array.isArray(target))
    .map((target) => ({ id: String(target.id ?? ''), name: String(target.name ?? '') }));
  return validProject(project);
}

export function importProjectJson(text: string): ProjectStorageResult {
  try {
    const value: unknown = JSON.parse(text);
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const migrated = migrateLegacyProject(value as Record<string, unknown>);
      if (migrated) return migrated;
    }
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
    const legacyProject = localStorage.getItem(LEGACY_PROJECT_STORAGE_KEY);
    if (legacyProject !== null) return importProjectJson(legacyProject);
    const legacy = readStoredDraft();
    if (legacy.ok && legacy.draft) {
      const project = createChannelWebhookProject();
      project.messages = [createChannelWebhookMessage(legacy.draft.body)];
      return validProject(project);
    }
    return { ok: false, error: 'No saved project was found.' };
  } catch { return { ok: false, error: 'The browser could not read the saved project.' }; }
}
