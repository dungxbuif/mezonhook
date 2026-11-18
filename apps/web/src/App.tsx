import {
  cloneChannelWebhookMessage,
  createChannelWebhookMessage,
  createChannelWebhookProject,
  validateChannelWebhookProject,
  type ChannelWebhookMessage,
  type ChannelWebhookProject,
} from '@mezonhook/schema';
import { useEffect, useState, type FormEvent } from 'react';
import { DeliveryConfig, type AppearanceTheme } from './components/DeliveryConfig';
import { HelpPanel } from './components/HelpPanel';
import { PayloadWorkbench } from './components/PayloadWorkbench';
import { ProjectEditor } from './components/ProjectEditor';
import { importProjectJson, readStoredProject, saveProject } from './project-storage';
import { parseChannelWebhookEnvelope, sendWebhookBatch } from './webhook';

const MAX_MESSAGES = 20;
const MAX_TARGETS = 10;
const APPEARANCE_STORAGE_KEY = 'mezonhook:appearance';
const themes: AppearanceTheme[] = ['dark', 'light', 'abyss', 'purple-haze', 'sunrise', 'sunset'];
type BuilderTab = 'editor' | 'preview';
type DeliveryStatus = { kind: 'success' | 'error'; message: string } | null;

const envelopeText = (message: ChannelWebhookMessage) => JSON.stringify({ type: 'hook', message }, null, 2);
const initialProject = () => { const stored = readStoredProject(); return stored.ok ? stored.project : createChannelWebhookProject(); };
const readAppearance = (): AppearanceTheme => { const saved = localStorage.getItem(APPEARANCE_STORAGE_KEY); return themes.includes(saved as AppearanceTheme) ? saved as AppearanceTheme : 'dark'; };
const readFileText = (file: File) => new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.addEventListener('load', () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Could not read file.'))); reader.addEventListener('error', () => reject(new Error('Could not read file.'))); reader.readAsText(file); });

export default function App() {
  const [project, setProject] = useState<ChannelWebhookProject>(initialProject);
  const [builderTab, setBuilderTab] = useState<BuilderTab>('editor');
  const [appearance, setAppearance] = useState<AppearanceTheme>(readAppearance);
  const [targetUrls, setTargetUrls] = useState<Record<string, string>>({});
  const [selectedTargetIds, setSelectedTargetIds] = useState<string[]>(() => project.targets[0] ? [project.targets[0].id] : []);
  const [activeMessageIndex, setActiveMessageIndex] = useState(0);
  const [payloadText, setPayloadText] = useState(() => envelopeText(project.messages[0]));
  const [payloadError, setPayloadError] = useState<string | null>(null);
  const [projectError, setProjectError] = useState('');
  const [deliveryStatus, setDeliveryStatus] = useState<DeliveryStatus>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => { saveProject(project); }, [project]);
  useEffect(() => { document.documentElement.dataset.theme = appearance; localStorage.setItem(APPEARANCE_STORAGE_KEY, appearance); }, [appearance]);

  const syncActivePayload = (nextProject: ChannelWebhookProject, index = activeMessageIndex) => {
    const safeIndex = Math.min(index, nextProject.messages.length - 1);
    setActiveMessageIndex(safeIndex);
    setPayloadText(envelopeText(nextProject.messages[safeIndex]));
    setPayloadError(null);
  };
  const commitProject = (next: ChannelWebhookProject, syncIndex?: number) => { setProject(next); syncActivePayload(next, syncIndex); };
  const updateMessage = (index: number, message: ChannelWebhookMessage) => {
    const next = { ...project, messages: project.messages.map((current, position) => position === index ? message : current) };
    setProject(next);
    if (index === activeMessageIndex) { setPayloadText(envelopeText(message)); setPayloadError(null); }
  };
  const addMessage = () => { if (project.messages.length >= MAX_MESSAGES) return; const next = { ...project, messages: [...project.messages, createChannelWebhookMessage('New message')] }; commitProject(next, next.messages.length - 1); };
  const duplicateMessage = (index: number) => { if (project.messages.length >= MAX_MESSAGES) return; const messages = [...project.messages]; messages.splice(index + 1, 0, cloneChannelWebhookMessage(messages[index])); commitProject({ ...project, messages }, index + 1); };
  const removeMessage = (index: number) => { if (project.messages.length <= 1) return; commitProject({ ...project, messages: project.messages.filter((_, position) => position !== index) }, Math.max(0, index - 1)); };
  const moveMessage = (index: number, direction: -1 | 1) => { const target = index + direction; if (target < 0 || target >= project.messages.length) return; const messages = [...project.messages]; [messages[index], messages[target]] = [messages[target], messages[index]]; commitProject({ ...project, messages }, target); };

  const addTarget = () => {
    if (project.targets.length >= MAX_TARGETS) return;
    const ids = new Set(project.targets.map((target) => target.id)); let ordinal = 1; while (ids.has(`target-${ordinal}`)) ordinal += 1;
    setProject({ ...project, targets: [...project.targets, { id: `target-${ordinal}`, name: `Mezon channel ${ordinal}` }] });
  };
  const removeTarget = (id: string) => { if (project.targets.length <= 1) return; setProject({ ...project, targets: project.targets.filter((target) => target.id !== id) }); setSelectedTargetIds((current) => current.filter((targetId) => targetId !== id)); setTargetUrls((current) => { const { [id]: _removed, ...rest } = current; return rest; }); };

  const changeRawPayload = (value: string) => {
    setPayloadText(value);
    try {
      const envelope = parseChannelWebhookEnvelope(value);
      setProject((current) => ({ ...current, messages: current.messages.map((message, index) => index === activeMessageIndex ? envelope.message : message) }));
      setPayloadError(null);
    } catch (error) { setPayloadError(error instanceof Error ? error.message : 'Payload JSON is invalid.'); }
  };

  const selectAdvancedMessage = (index: number) => { setActiveMessageIndex(index); setPayloadText(envelopeText(project.messages[index])); setPayloadError(null); };
  const importProject = async (file?: File) => {
    if (!file) return;
    try {
      const result = importProjectJson(await readFileText(file));
      if (!result.ok) { setProjectError(`Unable to import project: ${result.error}`); return; }
      setProject(result.project); setSelectedTargetIds(result.project.targets[0] ? [result.project.targets[0].id] : []); setTargetUrls({}); setProjectError(''); syncActivePayload(result.project, 0);
    } catch { setProjectError('Unable to import project: The selected file could not be read.'); }
  };
  const exportProject = () => {
    const validation = validateChannelWebhookProject(project);
    if (!validation.valid) { setProjectError(`Unable to export project: ${validation.errors.join(' ')}`); return; }
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' }); const href = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = href; link.download = 'mezonhook-project.json'; link.click(); URL.revokeObjectURL(href);
  };
  const sendProject = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setDeliveryStatus(null);
    if (payloadError) { setDeliveryStatus({ kind: 'error', message: payloadError }); return; }
    const targets = project.targets.filter((target) => selectedTargetIds.includes(target.id));
    if (targets.length === 0) { setDeliveryStatus({ kind: 'error', message: 'Select at least one target before sending.' }); return; }
    const urls = targets.map((target) => targetUrls[target.id]?.trim() ?? '');
    if (urls.some((url) => !url)) { setDeliveryStatus({ kind: 'error', message: 'Enter a Channel Webhook URL for every selected target.' }); return; }
    setSending(true);
    try {
      const deliveries = await sendWebhookBatch(urls, project.messages);
      setTargetUrls({});
      setDeliveryStatus({ kind: 'success', message: `Sent ${project.messages.length} ${project.messages.length === 1 ? 'message' : 'messages'} to ${targets.length} ${targets.length === 1 ? 'target' : 'targets'} (${deliveries} ${deliveries === 1 ? 'delivery' : 'deliveries'}).` });
    } catch (error) { setDeliveryStatus({ kind: 'error', message: error instanceof Error ? error.message : 'Could not send this project.' }); }
    finally { setSending(false); }
  };
  const projectValid = validateChannelWebhookProject(project).valid;
  const sendDisabled = sending || Boolean(payloadError) || !projectValid;

  const secondary = <>
    <details className="builder-section advanced-section"><summary>Advanced JSON and code</summary><div className="details-body">
      {project.messages.length > 1 && <label><span>Message to inspect</span><select aria-label="Advanced message" value={activeMessageIndex} onChange={(event) => selectAdvancedMessage(Number(event.target.value))}>{project.messages.map((_, index) => <option value={index} key={index}>Message {index + 1}</option>)}</select></label>}
      <PayloadWorkbench value={payloadText} error={payloadError} webhookUrl={targetUrls[selectedTargetIds[0] ?? '']} onChange={changeRawPayload} />
    </div></details>
    <HelpPanel />
    <DeliveryConfig targets={project.targets} selectedTargetIds={selectedTargetIds} targetUrls={targetUrls} disabled={sendDisabled} sending={sending} messageCount={project.messages.length} appearance={appearance} status={deliveryStatus} onSubmit={sendProject} onToggleTarget={(id, checked) => setSelectedTargetIds((current) => checked ? [...new Set([...current, id])] : current.filter((targetId) => targetId !== id))} onTargetNameChange={(id, name) => setProject({ ...project, targets: project.targets.map((target) => target.id === id ? { ...target, name } : target) })} onTargetUrlChange={(id, url) => setTargetUrls((current) => ({ ...current, [id]: url }))} onAddTarget={addTarget} onRemoveTarget={removeTarget} onAppearanceChange={setAppearance} />
  </>;

  return <main className="workspace-shell">
    <a className="skip-link" href="#composer">Skip to composer</a>
    <header className="channel-topbar"><div className="topbar-brand"><span className="topbar-logo" aria-hidden="true">M</span><span className="topbar-project">MezonHook</span></div><div className="topbar-actions"><label className="topbar-button" htmlFor="project-import"><span aria-hidden="true">Import</span><span className="visually-hidden"> project</span></label><input id="project-import" className="visually-hidden" type="file" accept="application/json,.json" onChange={(event) => { void importProject(event.currentTarget.files?.[0]); event.currentTarget.value = ''; }} /><button type="button" className="topbar-button" aria-label="Export project" onClick={exportProject}>Export</button><button type="submit" form="delivery-form" className="topbar-send" disabled={sendDisabled}>Send</button></div></header>
    {projectError && <p className="form-alert global-alert" role="alert">{projectError}</p>}
    <ProjectEditor messages={project.messages} activeTab={builderTab} secondary={secondary} onTabChange={setBuilderTab} onMessageChange={updateMessage} onAddMessage={addMessage} onDuplicateMessage={duplicateMessage} onRemoveMessage={removeMessage} onMoveMessage={moveMessage} />
  </main>;
}
