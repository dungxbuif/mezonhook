import { useEffect, useState, type CSSProperties, type DragEvent, type FormEvent, type ReactNode } from 'react';
import {
  createWebhookProject,
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
type ComposerSection = 'content' | 'embeds' | 'fields' | 'components' | 'advanced';
type BuilderTab = 'editor' | 'preview';

const buttonStyles: Array<{ value: MessageButtonStyle; label: string }> = [
  { value: 1, label: 'Primary' }, { value: 2, label: 'Secondary' }, { value: 3, label: 'Success' },
  { value: 4, label: 'Danger' }, { value: 5, label: 'Link' },
];

function createBlankDraft(): MessageDraft {
  return { body: '', card: { color: '#5865F2', title: '', description: '', author: '', thumbnail: '', image: '', fields: [] }, buttons: [] };
}

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

function MessageEditorSection({
  draft, index, canDuplicate, canRemove, dragged, onUpdateMessage, onUpdateCard, onAddField, onUpdateField, onRemoveField, onAddButton, onUpdateButton, onRemoveButton, onDuplicate, onRemove, onDragStart, onDragOver, onDrop, onDragEnd,
}: {
  draft: MessageDraft; index: number; canDuplicate: boolean; canRemove: boolean; dragged: boolean;
  onUpdateMessage: (update: (current: MessageDraft) => MessageDraft) => void;
  onUpdateCard: (property: keyof MessageDraft['card'], value: string) => void;
  onAddField: () => void; onUpdateField: (fieldIndex: number, property: 'name' | 'value' | 'inline', value: string | boolean) => void; onRemoveField: (fieldIndex: number) => void;
  onAddButton: () => void; onUpdateButton: (buttonIndex: number, property: 'id' | 'label' | 'style', value: string | MessageButtonStyle) => void; onRemoveButton: (buttonIndex: number) => void;
  onDuplicate: () => void; onRemove: () => void;
  onDragStart: (event: DragEvent<HTMLElement>) => void; onDragOver: (event: DragEvent<HTMLElement>) => void; onDrop: (event: DragEvent<HTMLElement>) => void; onDragEnd: () => void;
}) {
  const [openSections, setOpenSections] = useState<Record<ComposerSection, boolean>>({ content: true, embeds: false, fields: false, components: false, advanced: false });
  const toggle = (section: ComposerSection) => setOpenSections((current) => ({ ...current, [section]: !current[section] }));
  const section = (name: ComposerSection, title: string, content: ReactNode) => <section className="composer-card" key={name}><button type="button" className="composer-trigger" aria-expanded={openSections[name]} aria-controls={`message-${index}-${name}`} onClick={() => toggle(name)}><span>{title}</span><span aria-hidden="true">⌄</span></button>{openSections[name] && <div id={`message-${index}-${name}`} className="composer-card-body">{content}</div>}</section>;

  return <article className={`message-editor-card bg-theme-primary border-theme-primary ${dragged ? 'message-editor-card--dragging' : ''}`} data-testid={`message-editor-${index + 1}`}>
    <header className="message-editor-header bg-theme-direct-message border-b-theme-primary" draggable onDragStart={onDragStart} onDragOver={onDragOver} onDrop={onDrop} onDragEnd={onDragEnd}>
      <div><p className="message-editor-kicker">Message {index + 1}</p><h2>{draft.card.title || 'Untitled message'}</h2></div>
      <div className="message-editor-actions"><button type="button" className="secondary-button" onClick={onDuplicate} disabled={!canDuplicate} aria-label={`Duplicate message ${index + 1}`}>Duplicate</button><button type="button" className="remove-button" onClick={onRemove} disabled={!canRemove} aria-label={`Remove message ${index + 1}`}>Remove</button></div>
    </header>
    <div className="composer-accordion">
      {section('content', 'Content', <label className="full-width"><span>Body</span><textarea className="bg-theme-input-primary border-theme-primary" value={draft.body} onChange={(event) => onUpdateMessage((current) => ({ ...current, body: event.target.value }))} rows={4} /></label>)}
      {section('embeds', 'Embeds', <><p className="accordion-note">This message supports one Mezon embed.</p><div className="form-grid"><label><span>Card title</span><input value={draft.card.title} onChange={(event) => onUpdateCard('title', event.target.value)} /></label><label><span>Color</span><input type="color" value={draft.card.color} onChange={(event) => onUpdateCard('color', event.target.value)} /></label><label className="full-width"><span>Description</span><textarea value={draft.card.description} onChange={(event) => onUpdateCard('description', event.target.value)} rows={4} /></label></div></>)}
      {section('fields', 'Fields', <><div className="section-heading"><div><h2>Fields</h2><p>{draft.card.fields.length} / {MAX_FIELDS}</p></div><button type="button" className="add-button" onClick={onAddField} disabled={draft.card.fields.length >= MAX_FIELDS}>Add field</button></div>{draft.card.fields.map((field, fieldIndex) => <div className="repeat-row" key={`field-${fieldIndex}`}><label><span>Field name</span><input value={field.name} onChange={(event) => onUpdateField(fieldIndex, 'name', event.target.value)} /></label><label><span>Field value</span><input value={field.value} onChange={(event) => onUpdateField(fieldIndex, 'value', event.target.value)} /></label><label className="inline-toggle"><input type="checkbox" checked={field.inline} onChange={(event) => onUpdateField(fieldIndex, 'inline', event.target.checked)} /><span>Inline</span></label><button type="button" className="remove-button" onClick={() => onRemoveField(fieldIndex)} aria-label={`Remove field ${fieldIndex + 1}`}>Remove</button></div>)}</>)}
      {section('components', 'Components', <><div className="section-heading"><div><h2>Actions</h2><p>{draft.buttons.length} / {MAX_BUTTONS}</p></div><button type="button" className="add-button" onClick={onAddButton} disabled={draft.buttons.length >= MAX_BUTTONS}>Add button</button></div>{draft.buttons.map((button, buttonIndex) => <div className="repeat-row button-row" key={`button-${buttonIndex}`}><label><span>Button label</span><input value={button.label} onChange={(event) => onUpdateButton(buttonIndex, 'label', event.target.value)} /></label><label><span>Button ID</span><input value={button.id} onChange={(event) => onUpdateButton(buttonIndex, 'id', event.target.value)} /></label><label><span>Button style</span><select value={button.style} onChange={(event) => onUpdateButton(buttonIndex, 'style', Number(event.target.value) as MessageButtonStyle)}>{buttonStyles.map((style) => <option key={style.value} value={style.value}>{style.label}</option>)}</select></label><button type="button" className="remove-button" onClick={() => onRemoveButton(buttonIndex)} aria-label={`Remove button ${buttonIndex + 1}`}>Remove</button></div>)}</>)}
      {section('advanced', 'Advanced', <div className="form-grid"><label><span>Author</span><input value={draft.card.author} onChange={(event) => onUpdateCard('author', event.target.value)} /></label><label><span>Thumbnail URL</span><input type="url" value={draft.card.thumbnail} onChange={(event) => onUpdateCard('thumbnail', event.target.value)} placeholder="https://" /></label><label className="full-width"><span>Image URL</span><input type="url" value={draft.card.image} onChange={(event) => onUpdateCard('image', event.target.value)} placeholder="https://" /></label></div>)}
    </div>
  </article>;
}

function App() {
  const [project, setProject] = useState<WebhookProject>(() => {
    const saved = readStoredProject();
    return saved.ok ? saved.project : createWebhookProject();
  });
  const [activeScreen, setActiveScreen] = useState<Screen>('builder');
  const [builderTab, setBuilderTab] = useState<BuilderTab>('editor');
  const [targetUrls, setTargetUrls] = useState<Record<string, string>>({});
  const [selectedTargetIds, setSelectedTargetIds] = useState<string[]>(() => [createWebhookProject().targets[0].id]);
  const [projectError, setProjectError] = useState('');
  const [deliveryStatus, setDeliveryStatus] = useState<Status>(null);
  const [isSending, setIsSending] = useState(false);
  const [draggedMessageIndex, setDraggedMessageIndex] = useState<number | null>(null);

  useEffect(() => { saveProject(project); }, [project]);

  const updateProject = (update: (current: WebhookProject) => WebhookProject) => {
    setProject((current) => normalizeProject(update(current)));
  };
  const updateMessage = (messageIndex: number, update: (current: MessageDraft) => MessageDraft) => {
    updateProject((current) => ({ ...current, messages: current.messages.map((message, index) => index === messageIndex ? update(message) : message) }));
  };
  const updateCard = (messageIndex: number, property: keyof MessageDraft['card'], value: string) => updateMessage(messageIndex, (current) => ({ ...current, card: { ...current.card, [property]: value } }));

  const addMessage = () => {
    if (project.messages.length >= MAX_MESSAGES) return;
    updateProject((current) => ({ ...current, messages: [...current.messages, createBlankDraft()] }));
  };
  const duplicateMessage = (messageIndex: number) => {
    if (project.messages.length >= MAX_MESSAGES) return;
    const insertionIndex = messageIndex + 1;
    updateProject((current) => ({ ...current, messages: [...current.messages.slice(0, insertionIndex), current.messages[messageIndex], ...current.messages.slice(insertionIndex)] }));
  };
  const removeMessage = (messageIndex: number) => {
    if (project.messages.length <= 1) return;
    updateProject((current) => ({ ...current, messages: current.messages.filter((_, index) => index !== messageIndex) }));
  };
  const reorderMessage = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= project.messages.length || toIndex >= project.messages.length) return;
    updateProject((current) => {
      const messages = [...current.messages];
      const [movingMessage] = messages.splice(fromIndex, 1);
      messages.splice(toIndex, 0, movingMessage);
      return { ...current, messages };
    });
  };

  const addField = (messageIndex: number) => {
    if (project.messages[messageIndex].card.fields.length >= MAX_FIELDS) return;
    updateMessage(messageIndex, (current) => ({ ...current, card: { ...current.card, fields: [...current.card.fields, { name: '', value: '', inline: false }] } }));
  };
  const updateField = (messageIndex: number, index: number, property: 'name' | 'value' | 'inline', value: string | boolean) => updateMessage(messageIndex, (current) => ({
    ...current, card: { ...current.card, fields: current.card.fields.map((field, fieldIndex) => fieldIndex === index ? { ...field, [property]: value } : field) },
  }));
  const removeField = (messageIndex: number, index: number) => updateMessage(messageIndex, (current) => ({ ...current, card: { ...current.card, fields: current.card.fields.filter((_, fieldIndex) => fieldIndex !== index) } }));
  const addButton = (messageIndex: number) => {
    if (project.messages[messageIndex].buttons.length >= MAX_BUTTONS) return;
    updateMessage(messageIndex, (current) => ({ ...current, buttons: [...current.buttons, { id: `button-${current.buttons.length + 1}`, label: 'New button', style: 2 }] }));
  };
  const updateButton = (messageIndex: number, index: number, property: 'id' | 'label' | 'style', value: string | MessageButtonStyle) => updateMessage(messageIndex, (current) => ({
    ...current, buttons: current.buttons.map((button, buttonIndex) => buttonIndex === index ? { ...button, [property]: value } : button),
  }));
  const removeButton = (messageIndex: number, index: number) => updateMessage(messageIndex, (current) => ({ ...current, buttons: current.buttons.filter((_, buttonIndex) => buttonIndex !== index) }));

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
    <main className="workspace-shell bg-theme-primary color-theme-primary">
      <header className="channel-topbar bg-theme-direct-message border-b-theme-primary">
        <div><p className="eyebrow">MezonHook · channel composer</p><h1>Webhook project builder</h1></div>
        <nav className="product-nav bg-theme-setting-nav" aria-label="Project screens">
          {(['builder', 'config', 'help'] as Screen[]).map((screen) => <button key={screen} type="button" className={activeScreen === screen ? 'nav-tab nav-tab--active bg-item-msg-selected' : 'nav-tab bg-item-hover'} onClick={() => setActiveScreen(screen)}>{screen[0].toUpperCase() + screen.slice(1)}</button>)}
        </nav>
        <div className="project-file-actions">
          <label className="import-button" htmlFor="project-import">Import project</label>
          <input id="project-import" className="visually-hidden" type="file" accept="application/json,.json" onChange={(event) => { void importProject(event.currentTarget.files?.[0]); event.currentTarget.value = ''; }} />
          <button type="button" className="secondary-button" onClick={exportProject}>Export project</button>
        </div>
      </header>
      {projectError && <p className="form-alert global-alert" role="alert">{projectError}</p>}

      {activeScreen === 'builder' && <><div className="builder-mobile-tabs bg-theme-setting-nav border-b-theme-primary" role="tablist" aria-label="Builder panes"><button type="button" role="tab" aria-selected={builderTab === 'editor'} className={builderTab === 'editor' ? 'mobile-pane-tab mobile-pane-tab--active bg-item-msg-selected' : 'mobile-pane-tab bg-item-hover'} onClick={() => setBuilderTab('editor')}>Editor</button><button type="button" role="tab" aria-selected={builderTab === 'preview'} className={builderTab === 'preview' ? 'mobile-pane-tab mobile-pane-tab--active bg-item-msg-selected' : 'mobile-pane-tab bg-item-hover'} onClick={() => setBuilderTab('preview')}>Preview</button></div><div className={`disco-builder disco-builder--${builderTab}`}><section className="editor-pane bg-theme-primary" aria-label="Message editors"><div className="pane-scroll"><div className="builder-project-heading"><p className="eyebrow">Builder</p><label className="project-name"><span>Project name</span><input className="bg-theme-input-primary border-theme-primary" value={project.name} onChange={(event) => updateProject((current) => ({ ...current, name: event.target.value }))} /></label></div>{project.messages.map((message, index) => <MessageEditorSection key={`editor-message-${index}`} draft={message} index={index} dragged={draggedMessageIndex === index} canDuplicate={project.messages.length < MAX_MESSAGES} canRemove={project.messages.length > 1} onUpdateMessage={(update) => updateMessage(index, update)} onUpdateCard={(property, value) => updateCard(index, property, value)} onAddField={() => addField(index)} onUpdateField={(fieldIndex, property, value) => updateField(index, fieldIndex, property, value)} onRemoveField={(fieldIndex) => removeField(index, fieldIndex)} onAddButton={() => addButton(index)} onUpdateButton={(buttonIndex, property, value) => updateButton(index, buttonIndex, property, value)} onRemoveButton={(buttonIndex) => removeButton(index, buttonIndex)} onDuplicate={() => duplicateMessage(index)} onRemove={() => removeMessage(index)} onDragStart={(event) => { event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', String(index)); setDraggedMessageIndex(index); }} onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; }} onDrop={(event) => { event.preventDefault(); const value = event.dataTransfer.getData('text/plain'); const sourceIndex = value === '' ? draggedMessageIndex : Number(value); if (sourceIndex !== null && Number.isInteger(sourceIndex)) reorderMessage(sourceIndex, index); setDraggedMessageIndex(null); }} onDragEnd={() => setDraggedMessageIndex(null)} />)}<button type="button" className="add-message-wide bg-item-hover border-theme-primary" onClick={addMessage} disabled={project.messages.length >= MAX_MESSAGES}>Add Message</button></div></section><section className="preview-pane bg-theme-direct-message border-left-theme-primary" aria-labelledby="preview-title"><div className="pane-scroll"><div className="preview-heading"><p className="eyebrow">Sequence preview</p><h2 id="preview-title">Messages send in this order</h2></div><div className="sequence-preview">{project.messages.map((message, index) => <MessagePreview key={`preview-message-${index}`} draft={message} index={index} selected={false} />)}</div></div></section></div></>}

      {activeScreen === 'config' && <section className="screen-panel config-panel" aria-labelledby="config-title"><p className="eyebrow">Configuration</p><h2 id="config-title">Delivery targets</h2><p className="editor-intro">Target URLs are session-only: they are password-masked, never saved in this project, and cleared after a successful batch.</p><form onSubmit={sendProject} className="target-list">{project.targets.map((target) => <div className="target-row" key={target.id}><label className="target-select"><input type="checkbox" checked={selectedTargetIds.includes(target.id)} onChange={(event) => toggleTarget(target.id, event.target.checked)} /><span>Send to this target</span></label><label><span>Target name</span><input value={target.name} onChange={(event) => updateTargetName(target.id, event.target.value)} /></label><label><span>Webhook URL for {target.name}</span><input type="password" autoComplete="off" value={targetUrls[target.id] ?? ''} onChange={(event) => updateTargetUrl(target.id, event.target.value)} placeholder="https://webhook.mezon.ai/webhooks/..." /></label><button type="button" className="remove-button" onClick={() => removeTarget(target.id)} disabled={project.targets.length <= 1}>Remove target</button></div>)}<div className="target-actions"><button type="button" className="secondary-button" onClick={addTarget} disabled={project.targets.length >= MAX_TARGETS}>Add target</button><button type="submit" className="add-button" disabled={isSending}>{isSending ? 'Sending…' : 'Send project'}</button></div></form>{deliveryStatus && <p className={deliveryStatus.kind === 'error' ? 'form-alert' : 'send-success'} role={deliveryStatus.kind === 'error' ? 'alert' : 'status'}>{deliveryStatus.message}</p>}</section>}

      {activeScreen === 'help' && <section className="screen-panel help-panel" aria-labelledby="help-title"><p className="eyebrow">Help</p><h2 id="help-title">Build and deliver a Mezon sequence</h2><div className="help-grid"><article><h3>1. Create a webhook</h3><p>Create a Channel Webhook in Mezon, copy its URL, and paste it only into Config for this browser session.</p></article><article><h3>2. Build the sequence</h3><p>Add, duplicate, move, and edit messages. The sequence preview shows the deterministic delivery order.</p></article><article><h3>3. Configure targets</h3><p>Name up to ten targets, select the destinations for this send, then enter each selected Channel Webhook URL.</p></article><article><h3>4. Save a project</h3><p>Projects persist locally and export as safe JSON. Imports replace messages and target names, never a webhook URL.</p></article><article><h3>5. Recover from a failure</h3><p>Delivery stops on the first failure. Check the target URL or network settings, then resend—earlier messages may already have been delivered.</p></article></div><a className="documentation-link" href="https://mezon.ai/docs/vi/" target="_blank" rel="noreferrer">Open Mezon documentation</a></section>}
    </main>
  );
}

export default App;
