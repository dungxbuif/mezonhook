import {
  cloneChannelWebhookProject,
  cloneProject,
  createChannelWebhookProject,
  createWebhookProject,
  normalizeProject,
  type ChannelWebhookProject,
  type MessageDraft,
  type WebhookProject,
  validateChannelWebhookProject,
  validateDraft,
  validateProject,
} from '@mezonhook/schema';
import { DRAFT_STORAGE_KEY } from './draft-storage';
import { PROJECT_STORAGE_KEY, type ProjectStorageResult } from './project-storage';

export type ComposerMode = 'webhook' | 'bot';

export const BOT_PROJECT_STORAGE_KEY = 'mezonhook:bot-project:v2';
export const COMPOSER_MODE_STORAGE_KEY = 'mezonhook:composer-mode';
const LEGACY_PROJECT_STORAGE_KEY = 'mezonhook:project:v2';

export interface ComposerState {
  mode: ComposerMode;
  webhook: ChannelWebhookProject;
  bot: WebhookProject;
  errors: string[];
}

function validateBotProject(value: unknown): ProjectStorageResult<WebhookProject> {
  const validation = validateProject(value);
  return validation.valid
    ? { ok: true, project: normalizeProject(value as WebhookProject) }
    : { ok: false, error: validation.errors.join(' ') };
}

function validateWebhookProject(value: unknown): ProjectStorageResult<ChannelWebhookProject> {
  const validation = validateChannelWebhookProject(value);
  return validation.valid
    ? { ok: true, project: cloneChannelWebhookProject(value as ChannelWebhookProject) }
    : { ok: false, error: validation.errors.join(' ') };
}

function parseStored<T>(text: string, validate: (value: unknown) => ProjectStorageResult<T>): ProjectStorageResult<T> {
  try { return validate(JSON.parse(text)); }
  catch { return { ok: false, error: 'Stored data is not valid JSON.' }; }
}

function recoverLegacyDraft(text: string): ProjectStorageResult<WebhookProject> {
  try {
    const draft: unknown = JSON.parse(text);
    const validation = validateDraft(draft);
    if (!validation.valid) return { ok: false, error: validation.errors.join(' ') };
    const project = createWebhookProject();
    project.messages = [draft as MessageDraft];
    return validateBotProject(project);
  } catch { return { ok: false, error: 'Stored legacy draft is not valid JSON.' }; }
}

export function importComposerProject(text: string):
  | { ok: true; mode: ComposerMode; project: ChannelWebhookProject | WebhookProject }
  | { ok: false; error: string } {
  let value: unknown;
  try { value = JSON.parse(text); }
  catch { return { ok: false, error: 'The selected file is not valid JSON.' }; }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { ok: false, error: 'Project must be an object.' };
  const version = (value as { version?: unknown }).version;
  if (version === 2) {
    const result = validateBotProject(value);
    return result.ok ? { ok: true, mode: 'bot', project: result.project } : result;
  }
  if (version === 3) {
    const result = validateWebhookProject(value);
    return result.ok ? { ok: true, mode: 'webhook', project: result.project } : result;
  }
  return { ok: false, error: 'Project version must be 2 (Bot SDK) or 3 (Channel Webhook).' };
}

export function saveComposerMode(mode: ComposerMode): void {
  try { localStorage.setItem(COMPOSER_MODE_STORAGE_KEY, mode); } catch { /* surfaced by project saves */ }
}

export function saveBotProject(project: WebhookProject): ProjectStorageResult<WebhookProject> {
  const result = validateBotProject(project);
  if (!result.ok) return result;
  try {
    localStorage.setItem(BOT_PROJECT_STORAGE_KEY, JSON.stringify(result.project));
    return result;
  } catch { return { ok: false, error: 'The browser could not save this Bot SDK project locally.' }; }
}

export function readComposerState(): ComposerState {
  const errors: string[] = [];
  let webhook = createChannelWebhookProject();
  let bot = createWebhookProject();
  let hasStoredWebhook = false;
  let hasStoredBot = false;
  let botInvalid = false;
  let savedMode: string | null = null;

  try {
    const webhookText = localStorage.getItem(PROJECT_STORAGE_KEY);
    hasStoredWebhook = webhookText !== null;
    if (webhookText !== null) {
      const result = parseStored(webhookText, validateWebhookProject);
      if (result.ok) webhook = result.project;
      else errors.push(`Stored Channel Webhook project: ${result.error}`);
    }

    const botText = localStorage.getItem(BOT_PROJECT_STORAGE_KEY);
    const legacyProjectText = botText === null ? localStorage.getItem(LEGACY_PROJECT_STORAGE_KEY) : null;
    const legacyDraftText = botText === null && legacyProjectText === null ? localStorage.getItem(DRAFT_STORAGE_KEY) : null;
    hasStoredBot = botText !== null || legacyProjectText !== null || legacyDraftText !== null;
    if (botText !== null || legacyProjectText !== null) {
      const result = parseStored(botText ?? legacyProjectText as string, validateBotProject);
      if (result.ok) bot = result.project;
      else { botInvalid = true; errors.push(`Stored Bot SDK project: ${result.error}`); }
    } else if (legacyDraftText !== null) {
      const result = recoverLegacyDraft(legacyDraftText);
      if (result.ok) bot = result.project;
      else { botInvalid = true; errors.push(`Stored Bot SDK draft: ${result.error}`); }
    }
    savedMode = localStorage.getItem(COMPOSER_MODE_STORAGE_KEY);
  } catch {
    errors.push('The browser could not read saved composer data.');
  }

  const requestedMode = savedMode === 'bot' || savedMode === 'webhook' ? savedMode : null;
  const mode: ComposerMode = requestedMode === 'bot' && botInvalid
    ? 'webhook'
    : requestedMode ?? (hasStoredBot && !hasStoredWebhook && !botInvalid ? 'bot' : 'webhook');
  return { mode, webhook, bot, errors };
}

export function cloneBotProject(project: WebhookProject): WebhookProject {
  return cloneProject(project);
}
