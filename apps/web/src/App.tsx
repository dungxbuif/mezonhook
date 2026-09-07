import { useEffect, useState, type CSSProperties, type FormEvent } from 'react';
import {
  createAnnouncementDraft,
  createDraftFromTemplate,
  createWebhookProject,
  messageTemplates,
  normalizeProject,
  validateProject,
  type MessageButtonStyle,
  type MessageDraft,
  type WebhookProject,
} from '@mezonhook/schema';
import { importProjectJson, readStoredProject, saveProject } from './project-storage';
import { sendWebhookBatch } from './webhook';

const MAX_MESSAGES = 20;
const MAX_TARGETS = 10;
const MAX_FIELDS = 25;
const MAX_BUTTONS = 5;

type Screen = 'builder' | 'config' | 'help';
type Status = { kind: 'success' | 'error'; message: string } | null;

const buttonStyles: Array<{ value: MessageButtonStyle; label: string }> = [
  { value: 1, label: 'Primary' }, { value: 2, label: 'Secondary' }, { value: 3, label: 'Success' },
  { value: 4, label: 'Danger' }, { value: 5, label: 'Link' },
];

function actionClass(style: MessageButtonStyle): string {
  return `preview-action preview-action--${buttonStyles.find((item) => item.value === style)?.label.toLowerCase() ?? 'primary'}`;
}

function readFileText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Could not read file.')));
    reader.addEventListener('error', () => reject(new Error('Could not read file.')));
    reader.readAsText(file);
  });
}

function MessagePreview({ draft, index, selected }: { draft: MessageDraft; index: number; selected: boolean }) {
  const rows: MessageDraft['card']['fields'][] = [];
  for (const field of draft.card.fields) {
    const lastRow = rows.at(-1);
    if (field.inline && lastRow?.[0]?.inline && lastRow.length < 3) lastRow.push(field);
    else rows.push([field]);
  }

  return (
    <article className={`sequence-message ${selected ? 'sequence-message--selected' : ''}`} data-testid="message-preview" aria-label={`Message ${index + 1}${selected ? ', selected' : ''}`}>
      <p className="sequence-label">Message {index + 1}{selected && ' · editing'}</p>
      {draft.body && <p className="message-body">{draft.body}</p>}
      <div className="embed-card" style={{ '--card-color': draft.card.color } as CSSProperties}>
        <div className="embed-rail" />
        {draft.card.author && <p className="embed-author">{draft.card.author}</p>}
        {draft.card.title && <h3 className="embed-title">{draft.card.title}</h3>}
        {draft.card.description && <p className="embed-description">{draft.card.description}</p>}
        {rows.length > 0 && <div className="embed-fields">{rows.map((row, rowIndex) => (
          <div className={`embed-fields-row embed-fields-row--${row.length}`} key={rowIndex}>
            {row.map((field, fieldIndex) => <div className="embed-field" key={`${rowIndex}-${fieldIndex}`}><strong>{field.name || 'Untitled field'}</strong><span>{field.value || 'Field value'}</span></div>)}
          </div>
        ))}</div>}
        {draft.card.thumbnail && <img className="embed-thumbnail" src={draft.card.thumbnail} alt="Card thumbnail" />}
        {draft.card.image && <img className="embed-image" src={draft.card.image} alt="Card image" />}
      </div>
      {draft.buttons.length > 0 && <div className="preview-actions" aria-label={`Message ${index + 1} actions`}>
        {draft.buttons.map((button) => <button type="button" className={actionClass(button.style)} key={button.id}>{button.label}</button>)}
      </div>}
    </article>
  );
}

function App() {
  const [project, setProject] = useState<WebhookProject>(() => {
    const saved = readStoredProject();
    return saved.ok ? saved.project : createWebhookProject();
  });
  const [activeScreen, setActiveScreen] = useState<Screen>('builder');
  const [selectedMessageIndex, setSelectedMessageIndex] = useState(0);
  const [targetUrls, setTargetUrls] = useState<Record<string, string>>({});
  const [selectedTargetIds, setSelectedTargetIds] = useState<string[]>(() => [createWebhookProject().targets[0].id]);
  const [projectError, setProjectError] = useState('');
  const [deliveryStatus, setDeliveryStatus] = useState<Status>(null);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => { saveProject(project); }, [project]);

  const selectedMessage = project.messages[selectedMessageIndex] ?? project.messages[0];
  const updateProject = (update: (current: WebhookProject) => WebhookProject) => {
    setProject((current) => normalizeProject(update(current)));
  };
  const updateSelectedMessage = (update: (current: MessageDraft) => MessageDraft) => {
    updateProject((current) => ({ ...current, messages: current.messages.map((message, index) => index === selectedMessageIndex ? update(message) : message) }));
  };
  const updateCard = (property: keyof MessageDraft['card'], value: string) => updateSelectedMessage((current) => ({ ...current, card: { ...current.card, [property]: value } }));

  const addMessage = () => {
    if (project.messages.length >= MAX_MESSAGES) return;
    updateProject((current) => ({ ...current, messages: [...current.messages, createAnnouncementDraft()] }));
    setSelectedMessageIndex(project.messages.length);
  };
  const duplicateSelectedMessage = () => {
    if (project.messages.length >= MAX_MESSAGES) return;
    const insertionIndex = selectedMessageIndex + 1;
    updateProject((current) => ({ ...current, messages: [...current.messages.slice(0, insertionIndex), current.messages[selectedMessageIndex], ...current.messages.slice(insertionIndex)] }));
    setSelectedMessageIndex(insertionIndex);
  };
  const removeSelectedMessage = () => {
    if (project.messages.length <= 1) return;
    updateProject((current) => ({ ...current, messages: current.messages.filter((_, index) => index !== selectedMessageIndex) }));
    setSelectedMessageIndex((index) => Math.max(0, Math.min(index, project.messages.length - 2)));
  };
  const moveSelectedMessage = (direction: -1 | 1) => {
    const nextIndex = selectedMessageIndex + direction;
    if (nextIndex < 0 || nextIndex >= project.messages.length) return;
    updateProject((current) => {
      const messages = [...current.messages];
      [messages[selectedMessageIndex], messages[nextIndex]] = [messages[nextIndex], messages[selectedMessageIndex]];
      return { ...current, messages };
    });
    setSelectedMessageIndex(nextIndex);
  };

  const addField = () => {
    if (selectedMessage.card.fields.length >= MAX_FIELDS) return;
    updateSelectedMessage((current) => ({ ...current, card: { ...current.card, fields: [...current.card.fields, { name: '', value: '', inline: false }] } }));
  };
  const updateField = (index: number, property: 'name' | 'value' | 'inline', value: string | boolean) => updateSelectedMessage((current) => ({
    ...current, card: { ...current.card, fields: current.card.fields.map((field, fieldIndex) => fieldIndex === index ? { ...field, [property]: value } : field) },
  }));
  const removeField = (index: number) => updateSelectedMessage((current) => ({ ...current, card: { ...current.card, fields: current.card.fields.filter((_, fieldIndex) => fieldIndex !== index) } }));
  const addButton = () => {
    if (selectedMessage.buttons.length >= MAX_BUTTONS) return;
    updateSelectedMessage((current) => ({ ...current, buttons: [...current.buttons, { id: `button-${current.buttons.length + 1}`, label: 'New button', style: 2 }] }));
  };
  const updateButton = (index: number, property: 'id' | 'label' | 'style', value: string | MessageButtonStyle) => updateSelectedMessage((current) => ({
    ...current, buttons: current.buttons.map((button, buttonIndex) => buttonIndex === index ? { ...button, [property]: value } : button),
  }));
  const removeButton = (index: number) => updateSelectedMessage((current) => ({ ...current, buttons: current.buttons.filter((_, buttonIndex) => buttonIndex !== index) }));

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
    setSelectedTargetIds((ids) => ids.filter((targetId) => targetId !== id));
    setTargetUrls((urls) => { const { [id]: _, ...remaining } = urls; return remaining; });
  };
  const updateTargetName = (id: string, name: string) => updateProject((current) => ({ ...current, targets: current.targets.map((target) => target.id === id ? { ...target, name } : target) }));
  const updateTargetUrl = (id: string, url: string) => setTargetUrls((current) => ({ ...current, [id]: url }));
  const toggleTarget = (id: string, checked: boolean) => setSelectedTargetIds((current) => checked ? [...new Set([...current, id])] : current.filter((targetId) => targetId !== id));

  const importProject = async (file: File | undefined) => {
    if (!file) return;
    try {
      const result = importProjectJson(await readFileText(file));
      if (!result.ok) { setProjectError(`Unable to import project: ${result.error}`); return; }
      setProject(result.project);
      setSelectedMessageIndex(0);
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
    const selectedTargets = project.targets.filter((target) => selectedTargetIds.includes(target.id));
    if (selectedTargets.length === 0) { setDeliveryStatus({ kind: 'error', message: 'Select at least one target before sending.' }); return; }
    if (selectedTargets.some((target) => !targetUrls[target.id]?.trim())) { setDeliveryStatus({ kind: 'error', message: 'Enter a Channel Webhook URL for every selected target.' }); return; }
    setIsSending(true);
    try {
      const count = await sendWebhookBatch(selectedTargets.map((target) => targetUrls[target.id]), project.messages);
      setTargetUrls({});
      setDeliveryStatus({ kind: 'success', message: `Sent ${count} ${count === 1 ? 'message' : 'messages'} to ${selectedTargets.length} ${selectedTargets.length === 1 ? 'target' : 'targets'}.` });
    } catch (error) {
      setDeliveryStatus({ kind: 'error', message: error instanceof Error ? error.message : 'Could not send this project. Please try again.' });
    } finally { setIsSending(false); }
  };

  return (
    <main className="workspace-shell">
      <header className="product-header">
        <div><p className="eyebrow">MezonHook</p><h1>Webhook project builder</h1></div>
        <nav className="product-nav" aria-label="Project screens">
          {(['builder', 'config', 'help'] as Screen[]).map((screen) => <button key={screen} type="button" className={activeScreen === screen ? 'nav-tab nav-tab--active' : 'nav-tab'} onClick={() => setActiveScreen(screen)}>{screen[0].toUpperCase() + screen.slice(1)}</button>)}
        </nav>
        <div className="project-file-actions">
          <label className="import-button" htmlFor="project-import">Import project</label>
          <input id="project-import" className="visually-hidden" type="file" accept="application/json,.json" onChange={(event) => { void importProject(event.currentTarget.files?.[0]); event.currentTarget.value = ''; }} />
          <button type="button" className="template-button" onClick={exportProject}>Export project</button>
        </div>
      </header>
      {projectError && <p className="form-alert global-alert" role="alert">{projectError}</p>}

      {activeScreen === 'builder' && <div className="builder-grid">
        <aside className="message-rail" aria-label="Project messages">
          <div className="rail-heading"><div><p className="eyebrow">Sequence</p><h2>{project.messages.length} / {MAX_MESSAGES} messages</h2></div><button type="button" className="add-button" onClick={addMessage} disabled={project.messages.length >= MAX_MESSAGES}>Add message</button></div>
          <div className="rail-list">{project.messages.map((message, index) => <button type="button" key={`${index}-${message.card.title}`} className={selectedMessageIndex === index ? 'rail-message rail-message--selected' : 'rail-message'} onClick={() => setSelectedMessageIndex(index)}><span>Message {index + 1}</span><strong>{message.card.title || 'Untitled message'}</strong></button>)}</div>
          <div className="message-lifecycle"><button type="button" className="template-button" onClick={duplicateSelectedMessage} disabled={project.messages.length >= MAX_MESSAGES}>Duplicate</button><button type="button" className="template-button" onClick={() => moveSelectedMessage(-1)} disabled={selectedMessageIndex === 0}>Move up</button><button type="button" className="template-button" onClick={() => moveSelectedMessage(1)} disabled={selectedMessageIndex === project.messages.length - 1}>Move down</button><button type="button" className="remove-button" onClick={removeSelectedMessage} disabled={project.messages.length <= 1}>Remove</button></div>
        </aside>
        <section className="editor-panel" aria-labelledby="editor-title">
          <p className="eyebrow">Builder</p><h2 id="editor-title">Message {selectedMessageIndex + 1}</h2>
          <label className="project-name"><span>Project name</span><input value={project.name} onChange={(event) => updateProject((current) => ({ ...current, name: event.target.value }))} /></label>
          <div className="template-picker" aria-label="Message templates"><span className="section-label">Replace selected message with a template</span><div className="template-buttons">{messageTemplates.map((template) => <button key={template.name} type="button" className="template-button" onClick={() => updateSelectedMessage(() => createDraftFromTemplate(template.name))}>{template.name}</button>)}</div></div>
          <div className="form-grid">
            <label className="full-width"><span>Body</span><textarea value={selectedMessage.body} onChange={(event) => updateSelectedMessage((current) => ({ ...current, body: event.target.value }))} rows={3} /></label>
            <label><span>Card title</span><input value={selectedMessage.card.title} onChange={(event) => updateCard('title', event.target.value)} /></label>
            <label><span>Color</span><input type="color" value={selectedMessage.card.color} onChange={(event) => updateCard('color', event.target.value)} /></label>
            <label className="full-width"><span>Description</span><textarea value={selectedMessage.card.description} onChange={(event) => updateCard('description', event.target.value)} rows={4} /></label>
            <label><span>Author</span><input value={selectedMessage.card.author} onChange={(event) => updateCard('author', event.target.value)} /></label>
            <label><span>Thumbnail URL</span><input type="url" value={selectedMessage.card.thumbnail} onChange={(event) => updateCard('thumbnail', event.target.value)} placeholder="https://" /></label>
            <label className="full-width"><span>Image URL</span><input type="url" value={selectedMessage.card.image} onChange={(event) => updateCard('image', event.target.value)} placeholder="https://" /></label>
          </div>
          <section className="editor-section" aria-labelledby="fields-title"><div className="section-heading"><div><h2 id="fields-title">Fields</h2><p>{selectedMessage.card.fields.length} / {MAX_FIELDS}</p></div><button type="button" className="add-button" onClick={addField} disabled={selectedMessage.card.fields.length >= MAX_FIELDS}>Add field</button></div>{selectedMessage.card.fields.map((field, index) => <div className="repeat-row" key={`field-${index}`}><label><span>Field name</span><input value={field.name} onChange={(event) => updateField(index, 'name', event.target.value)} /></label><label><span>Field value</span><input value={field.value} onChange={(event) => updateField(index, 'value', event.target.value)} /></label><label className="inline-toggle"><input type="checkbox" checked={field.inline} onChange={(event) => updateField(index, 'inline', event.target.checked)} /><span>Inline</span></label><button type="button" className="remove-button" onClick={() => removeField(index)} aria-label={`Remove field ${index + 1}`}>Remove</button></div>)}</section>
          <section className="editor-section" aria-labelledby="buttons-title"><div className="section-heading"><div><h2 id="buttons-title">Actions</h2><p>{selectedMessage.buttons.length} / {MAX_BUTTONS}</p></div><button type="button" className="add-button" onClick={addButton} disabled={selectedMessage.buttons.length >= MAX_BUTTONS}>Add button</button></div>{selectedMessage.buttons.map((button, index) => <div className="repeat-row button-row" key={`button-${index}`}><label><span>Button label</span><input value={button.label} onChange={(event) => updateButton(index, 'label', event.target.value)} /></label><label><span>Button ID</span><input value={button.id} onChange={(event) => updateButton(index, 'id', event.target.value)} /></label><label><span>Button style</span><select value={button.style} onChange={(event) => updateButton(index, 'style', Number(event.target.value) as MessageButtonStyle)}>{buttonStyles.map((style) => <option key={style.value} value={style.value}>{style.label}</option>)}</select></label><button type="button" className="remove-button" onClick={() => removeButton(index)} aria-label={`Remove button ${index + 1}`}>Remove</button></div>)}</section>
        </section>
        <section className="preview-panel" aria-labelledby="preview-title"><div className="preview-heading"><p className="eyebrow">Sequence preview</p><h2 id="preview-title">Messages send in this order</h2></div><div className="sequence-preview">{project.messages.map((message, index) => <MessagePreview key={`${index}-${message.card.title}`} draft={message} index={index} selected={selectedMessageIndex === index} />)}</div></section>
      </div>}

      {activeScreen === 'config' && <section className="screen-panel config-panel" aria-labelledby="config-title"><p className="eyebrow">Configuration</p><h2 id="config-title">Delivery targets</h2><p className="editor-intro">Target URLs are session-only: they are password-masked, never saved in this project, and cleared after a successful batch.</p><form onSubmit={sendProject} className="target-list">{project.targets.map((target) => <div className="target-row" key={target.id}><label className="target-select"><input type="checkbox" checked={selectedTargetIds.includes(target.id)} onChange={(event) => toggleTarget(target.id, event.target.checked)} /><span>Send to this target</span></label><label><span>Target name</span><input value={target.name} onChange={(event) => updateTargetName(target.id, event.target.value)} /></label><label><span>Webhook URL for {target.name}</span><input type="password" autoComplete="off" value={targetUrls[target.id] ?? ''} onChange={(event) => updateTargetUrl(target.id, event.target.value)} placeholder="https://webhook.mezon.ai/webhooks/..." /></label><button type="button" className="remove-button" onClick={() => removeTarget(target.id)} disabled={project.targets.length <= 1}>Remove target</button></div>)}<div className="target-actions"><button type="button" className="template-button" onClick={addTarget} disabled={project.targets.length >= MAX_TARGETS}>Add target</button><button type="submit" className="add-button" disabled={isSending}>{isSending ? 'Sending…' : 'Send project'}</button></div></form>{deliveryStatus && <p className={deliveryStatus.kind === 'error' ? 'form-alert' : 'send-success'} role={deliveryStatus.kind === 'error' ? 'alert' : 'status'}>{deliveryStatus.message}</p>}</section>}

      {activeScreen === 'help' && <section className="screen-panel help-panel" aria-labelledby="help-title"><p className="eyebrow">Help</p><h2 id="help-title">Build and deliver a Mezon sequence</h2><div className="help-grid"><article><h3>1. Create a webhook</h3><p>Create a Channel Webhook in Mezon, copy its URL, and paste it only into Config for this browser session.</p></article><article><h3>2. Build the sequence</h3><p>Add, duplicate, move, and edit messages. The sequence preview shows the deterministic delivery order.</p></article><article><h3>3. Configure targets</h3><p>Name up to ten targets, select the destinations for this send, then enter each selected Channel Webhook URL.</p></article><article><h3>4. Save a project</h3><p>Projects persist locally and export as safe JSON. Imports replace messages and target names, never a webhook URL.</p></article><article><h3>5. Recover from a failure</h3><p>Delivery stops on the first failure. Check the target URL or network settings, then resend—earlier messages may already have been delivered.</p></article></div><a className="documentation-link" href="https://mezon.ai/docs/vi/" target="_blank" rel="noreferrer">Open Mezon documentation</a></section>}
    </main>
  );
}

export default App;
