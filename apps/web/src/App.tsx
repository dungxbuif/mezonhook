import { useEffect, useState, type DragEvent, type FormEvent } from 'react';
import { createWebhookProject, normalizeProject, validateProject, type MessageDraft, type WebhookProject } from '@mezonhook/schema';
import { DeliveryConfig } from './components/DeliveryConfig';
import { HelpPanel } from './components/HelpPanel';
import { ProjectEditor } from './components/ProjectEditor';
import { importProjectJson, readStoredProject, saveProject } from './project-storage';
import { sendWebhookBatch } from './webhook';

const MAX_MESSAGES = 20;
const MAX_TARGETS = 10;
type Screen = 'builder' | 'config' | 'help';
type BuilderTab = 'editor' | 'preview';
type DeliveryStatus = { kind: 'success' | 'error'; message: string } | null;

function createBlankDraft(): MessageDraft {
  return { body: '', card: { color: '#5865F2', title: '', description: '', author: '', thumbnail: '', image: '', fields: [] }, buttons: [] };
}

function readFileText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Could not read file.')));
    reader.addEventListener('error', () => reject(new Error('Could not read file.')));
    reader.readAsText(file);
  });
}

export default function App() {
  const [project, setProject] = useState<WebhookProject>(() => { const saved = readStoredProject(); return saved.ok ? saved.project : createWebhookProject(); });
  const [screen, setScreen] = useState<Screen>('builder');
  const [builderTab, setBuilderTab] = useState<BuilderTab>('editor');
  const [targetUrls, setTargetUrls] = useState<Record<string, string>>({});
  const [selectedTargetIds, setSelectedTargetIds] = useState<string[]>(() => [createWebhookProject().targets[0].id]);
  const [projectError, setProjectError] = useState('');
  const [deliveryStatus, setDeliveryStatus] = useState<DeliveryStatus>(null);
  const [sending, setSending] = useState(false);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

  useEffect(() => { saveProject(project); }, [project]);

  const updateProject = (update: (current: WebhookProject) => WebhookProject) => setProject((current) => normalizeProject(update(current)));
  const updateMessage = (index: number, update: (current: MessageDraft) => MessageDraft) => updateProject((current) => ({ ...current, messages: current.messages.map((message, messageIndex) => messageIndex === index ? update(message) : message) }));
  const addMessage = () => { if (project.messages.length < MAX_MESSAGES) updateProject((current) => ({ ...current, messages: [...current.messages, createBlankDraft()] })); };
  const duplicateMessage = (index: number) => { if (project.messages.length < MAX_MESSAGES) updateProject((current) => ({ ...current, messages: [...current.messages.slice(0, index + 1), current.messages[index], ...current.messages.slice(index + 1)] })); };
  const removeMessage = (index: number) => { if (project.messages.length > 1) updateProject((current) => ({ ...current, messages: current.messages.filter((_, messageIndex) => messageIndex !== index) })); };
  const reorderMessage = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0 || from >= project.messages.length || to >= project.messages.length) return;
    updateProject((current) => { const messages = [...current.messages]; const [message] = messages.splice(from, 1); messages.splice(to, 0, message); return { ...current, messages }; });
  };
  const startDrag = (index: number, event: DragEvent<HTMLElement>) => { event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', String(index)); setDraggingIndex(index); };
  const dragOver = (event: DragEvent<HTMLElement>) => { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; };
  const drop = (index: number, event: DragEvent<HTMLElement>) => { event.preventDefault(); const text = event.dataTransfer.getData('text/plain'); const source = text === '' ? draggingIndex : Number(text); if (source !== null && Number.isInteger(source)) reorderMessage(source, index); setDraggingIndex(null); };

  const addTarget = () => {
    if (project.targets.length >= MAX_TARGETS) return;
    const ids = new Set(project.targets.map((target) => target.id));
    let position = 1;
    while (ids.has(`target-${position}`)) position += 1;
    updateProject((current) => ({ ...current, targets: [...current.targets, { id: `target-${position}`, name: `Mezon channel ${position}` }] }));
  };
  const removeTarget = (id: string) => {
    if (project.targets.length <= 1) return;
    updateProject((current) => ({ ...current, targets: current.targets.filter((target) => target.id !== id) }));
    setSelectedTargetIds((current) => current.filter((targetId) => targetId !== id));
    setTargetUrls((current) => { const { [id]: _, ...remaining } = current; return remaining; });
  };
  const importProject = async (file: File | undefined) => {
    if (!file) return;
    try {
      const result = importProjectJson(await readFileText(file));
      if (!result.ok) { setProjectError(`Unable to import project: ${result.error}`); return; }
      setProject(result.project);
      setSelectedTargetIds(result.project.targets.length ? [result.project.targets[0].id] : []);
      setTargetUrls({});
      setProjectError('');
    } catch { setProjectError('Unable to import project: The selected file could not be read.'); }
  };
  const exportProject = () => {
    const validation = validateProject(project);
    if (!validation.valid) { setProjectError(`Unable to export project: ${validation.errors.join(' ')}`); return; }
    const blob = new Blob([JSON.stringify(normalizeProject(project), null, 2)], { type: 'application/json' });
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = 'mezonhook-project.json';
    link.click();
    URL.revokeObjectURL(href);
  };
  const sendProject = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setDeliveryStatus(null);
    const targets = project.targets.filter((target) => selectedTargetIds.includes(target.id));
    if (targets.length === 0) { setDeliveryStatus({ kind: 'error', message: 'Select at least one target before sending.' }); return; }
    if (targets.some((target) => !targetUrls[target.id]?.trim())) { setDeliveryStatus({ kind: 'error', message: 'Enter a Channel Webhook URL for every selected target.' }); return; }
    setSending(true);
    try {
      const count = await sendWebhookBatch(targets.map((target) => targetUrls[target.id]), project.messages);
      setTargetUrls({});
      setDeliveryStatus({ kind: 'success', message: `Sent ${count} ${count === 1 ? 'message' : 'messages'} to ${targets.length} ${targets.length === 1 ? 'target' : 'targets'}.` });
    } catch (error) { setDeliveryStatus({ kind: 'error', message: error instanceof Error ? error.message : 'Could not send this project. Please try again.' }); } finally { setSending(false); }
  };

  return <main className="workspace-shell bg-theme-primary color-theme-primary">
    <header className="channel-topbar bg-theme-direct-message border-b-theme-primary">
      <div><p className="eyebrow">MezonHook · channel composer</p><h1>Webhook project builder</h1></div>
      <nav className="product-nav bg-theme-setting-nav" aria-label="Project screens">{(['builder', 'config', 'help'] as Screen[]).map((item) => <button key={item} type="button" className={screen === item ? 'nav-tab nav-tab--active bg-item-msg-selected' : 'nav-tab bg-item-hover'} onClick={() => setScreen(item)}>{item[0].toUpperCase() + item.slice(1)}</button>)}</nav>
      <div className="project-file-actions"><label className="import-button" htmlFor="project-import">Import project</label><input id="project-import" className="visually-hidden" type="file" accept="application/json,.json" onChange={(event) => { void importProject(event.currentTarget.files?.[0]); event.currentTarget.value = ''; }} /><button type="button" className="secondary-button" onClick={exportProject}>Export project</button></div>
    </header>
    {projectError && <p className="form-alert global-alert" role="alert">{projectError}</p>}
    {screen === 'builder' && <ProjectEditor projectName={project.name} messages={project.messages} activeTab={builderTab} draggingIndex={draggingIndex} onProjectNameChange={(name) => updateProject((current) => ({ ...current, name }))} onTabChange={setBuilderTab} onMessageChange={updateMessage} onAddMessage={addMessage} onDuplicateMessage={duplicateMessage} onRemoveMessage={removeMessage} onDragStart={startDrag} onDragOver={dragOver} onDrop={drop} onDragEnd={() => setDraggingIndex(null)} />}
    {screen === 'config' && <DeliveryConfig targets={project.targets} selectedTargetIds={selectedTargetIds} targetUrls={targetUrls} sending={sending} status={deliveryStatus} onSubmit={sendProject} onToggleTarget={(id, checked) => setSelectedTargetIds((current) => checked ? [...new Set([...current, id])] : current.filter((targetId) => targetId !== id))} onTargetNameChange={(id, name) => updateProject((current) => ({ ...current, targets: current.targets.map((target) => target.id === id ? { ...target, name } : target) }))} onTargetUrlChange={(id, url) => setTargetUrls((current) => ({ ...current, [id]: url }))} onAddTarget={addTarget} onRemoveTarget={removeTarget} />}
    {screen === 'help' && <HelpPanel />}
  </main>;
}
