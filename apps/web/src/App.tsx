import { useEffect, useState } from 'react';
import {
  createAnnouncementDraft,
  createDraftFromTemplate,
  messageTemplates,
  validateDraft,
  type MessageButtonStyle,
  type MessageDraft,
} from '@mezonhook/schema';
import { importDraftJson, normalizeDraft, readStoredDraft, saveDraft } from './draft-storage';
import { sendWebhook } from './webhook';

const MAX_FIELDS = 25;
const MAX_BUTTONS = 5;

const buttonStyles: Array<{ value: MessageButtonStyle; label: string }> = [
  { value: 1, label: 'Primary' },
  { value: 2, label: 'Secondary' },
  { value: 3, label: 'Success' },
  { value: 4, label: 'Danger' },
  { value: 5, label: 'Link' },
];

function actionClass(style: MessageButtonStyle): string {
  return `preview-action preview-action--${buttonStyles.find((item) => item.value === style)?.label.toLowerCase() ?? 'primary'}`;
}

function readFileText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('The selected file could not be read.'));
    });
    reader.addEventListener('error', () => reject(new Error('The selected file could not be read.')));
    reader.readAsText(file);
  });
}

function App() {
  const [draft, setDraft] = useState<MessageDraft>(() => {
    const restored = readStoredDraft();
    return restored.ok && restored.draft ? restored.draft : createAnnouncementDraft();
  });
  const [importError, setImportError] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [sendStatus, setSendStatus] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    saveDraft(draft);
  }, [draft]);

  const updateDraft = (update: (current: MessageDraft) => MessageDraft) => {
    setDraft((current) => normalizeDraft(update(current)));
  };

  const updateCard = (property: keyof MessageDraft['card'], value: string) => {
    updateDraft((current) => ({
      ...current,
      card: { ...current.card, [property]: value },
    }));
  };

  const selectTemplate = (name: string) => {
    setDraft(normalizeDraft(createDraftFromTemplate(name)));
  };

  const importTemplate = async (file: File | undefined) => {
    if (!file) return;
    try {
      const result = importDraftJson(await readFileText(file));
      if (!result.ok || !result.draft) {
        setImportError(`Unable to import template: ${result.ok ? 'The draft is missing.' : result.error}`);
        return;
      }
      setDraft(normalizeDraft(result.draft));
      setImportError('');
    } catch {
      setImportError('Unable to import template: The selected file could not be read.');
    }
  };

  const exportTemplate = () => {
    const validation = validateDraft(draft);
    if (!validation.valid) {
      setImportError(`Unable to export template: ${validation.errors.join(' ')}`);
      return;
    }
    const blob = new Blob([JSON.stringify(normalizeDraft(draft), null, 2)], { type: 'application/json' });
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = 'mezonhook-template.json';
    link.click();
    URL.revokeObjectURL(href);
  };

  const submitWebhook = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSending(true);
    setSendStatus(null);
    try {
      await sendWebhook(webhookUrl, draft);
      setWebhookUrl('');
      setSendStatus({ kind: 'success', message: 'Message sent to Mezon.' });
    } catch (error) {
      setSendStatus({ kind: 'error', message: error instanceof Error ? error.message : 'Could not send the message. Please try again.' });
    } finally {
      setIsSending(false);
    }
  };

  const addField = () => {
    if (draft.card.fields.length >= MAX_FIELDS) return;

    updateDraft((current) => ({
      ...current,
      card: {
        ...current.card,
        fields: [...current.card.fields, { name: '', value: '', inline: false }],
      },
    }));
  };

  const updateField = (index: number, property: 'name' | 'value' | 'inline', value: string | boolean) => {
    updateDraft((current) => ({
      ...current,
      card: {
        ...current.card,
        fields: current.card.fields.map((field, fieldIndex) =>
          fieldIndex === index ? { ...field, [property]: value } : field,
        ),
      },
    }));
  };

  const removeField = (index: number) => {
    updateDraft((current) => ({
      ...current,
      card: { ...current.card, fields: current.card.fields.filter((_, fieldIndex) => fieldIndex !== index) },
    }));
  };

  const addButton = () => {
    if (draft.buttons.length >= MAX_BUTTONS) return;

    updateDraft((current) => ({
      ...current,
      buttons: [...current.buttons, { id: `button-${current.buttons.length + 1}`, label: 'New button', style: 2 }],
    }));
  };

  const updateButton = (index: number, property: 'id' | 'label' | 'style', value: string | MessageButtonStyle) => {
    updateDraft((current) => ({
      ...current,
      buttons: current.buttons.map((button, buttonIndex) =>
        buttonIndex === index ? { ...button, [property]: value } : button,
      ),
    }));
  };

  const removeButton = (index: number) => {
    updateDraft((current) => ({
      ...current,
      buttons: current.buttons.filter((_, buttonIndex) => buttonIndex !== index),
    }));
  };

  const fieldRows: MessageDraft['card']['fields'][] = [];
  for (const field of draft.card.fields) {
    const lastRow = fieldRows.at(-1);
    if (field.inline && lastRow?.[0]?.inline && lastRow.length < 3) {
      lastRow.push(field);
    } else {
      fieldRows.push([field]);
    }
  }

  return (
    <main className="app-shell">
      <section className="editor-panel" aria-labelledby="editor-title">
        <p className="eyebrow">MezonHook</p>
        <h1 id="editor-title">Message composer</h1>
        <p className="editor-intro">Draft a rich message and inspect its Mezon-style rendering as you type.</p>

        <div className="template-picker" aria-label="Message templates">
          <span className="section-label">Start from a template</span>
          <div className="template-buttons">
            {messageTemplates.map((template) => (
              <button key={template.name} type="button" className="template-button" onClick={() => selectTemplate(template.name)}>
                {template.name}
              </button>
            ))}
          </div>
          <div className="template-file-actions">
            <label className="import-button" htmlFor="template-import">Import template</label>
            <input
              id="template-import"
              className="visually-hidden"
              type="file"
              accept="application/json,.json"
              onChange={(event) => {
                void importTemplate(event.currentTarget.files?.[0]);
                event.currentTarget.value = '';
              }}
            />
            <button type="button" className="template-button" onClick={exportTemplate}>Export template</button>
          </div>
          {importError && <p className="form-alert" role="alert">{importError}</p>}
        </div>

        <div className="form-grid">
          <label className="full-width">
            <span>Body</span>
            <textarea value={draft.body} onChange={(event) => updateDraft((current) => ({ ...current, body: event.target.value }))} rows={3} />
          </label>
          <label>
            <span>Card title</span>
            <input value={draft.card.title} onChange={(event) => updateCard('title', event.target.value)} />
          </label>
          <label>
            <span>Color</span>
            <input type="color" value={draft.card.color} onChange={(event) => updateCard('color', event.target.value)} />
          </label>
          <label className="full-width">
            <span>Description</span>
            <textarea value={draft.card.description} onChange={(event) => updateCard('description', event.target.value)} rows={4} />
          </label>
          <label>
            <span>Author</span>
            <input value={draft.card.author} onChange={(event) => updateCard('author', event.target.value)} />
          </label>
          <label>
            <span>Thumbnail URL</span>
            <input type="url" value={draft.card.thumbnail} onChange={(event) => updateCard('thumbnail', event.target.value)} placeholder="https://" />
          </label>
          <label className="full-width">
            <span>Image URL</span>
            <input type="url" value={draft.card.image} onChange={(event) => updateCard('image', event.target.value)} placeholder="https://" />
          </label>
        </div>

        <section className="editor-section" aria-labelledby="fields-title">
          <div className="section-heading">
            <div>
              <h2 id="fields-title">Fields</h2>
              <p>{draft.card.fields.length} / {MAX_FIELDS}</p>
            </div>
            <button type="button" className="add-button" onClick={addField} disabled={draft.card.fields.length >= MAX_FIELDS}>Add field</button>
          </div>
          {draft.card.fields.map((field, index) => (
            <div className="repeat-row" key={`field-${index}`}>
              <label>
                <span>Field name</span>
                <input value={field.name} onChange={(event) => updateField(index, 'name', event.target.value)} />
              </label>
              <label>
                <span>Field value</span>
                <input value={field.value} onChange={(event) => updateField(index, 'value', event.target.value)} />
              </label>
              <label className="inline-toggle">
                <input type="checkbox" checked={field.inline} onChange={(event) => updateField(index, 'inline', event.target.checked)} />
                <span>Inline</span>
              </label>
              <button type="button" className="remove-button" onClick={() => removeField(index)} aria-label={`Remove field ${index + 1}`}>Remove</button>
            </div>
          ))}
        </section>

        <section className="editor-section" aria-labelledby="buttons-title">
          <div className="section-heading">
            <div>
              <h2 id="buttons-title">Actions</h2>
              <p>{draft.buttons.length} / {MAX_BUTTONS}</p>
            </div>
            <button type="button" className="add-button" onClick={addButton} disabled={draft.buttons.length >= MAX_BUTTONS}>Add button</button>
          </div>
          {draft.buttons.map((button, index) => (
            <div className="repeat-row button-row" key={`button-${index}`}>
              <label>
                <span>Button label</span>
                <input value={button.label} onChange={(event) => updateButton(index, 'label', event.target.value)} />
              </label>
              <label>
                <span>Button ID</span>
                <input value={button.id} onChange={(event) => updateButton(index, 'id', event.target.value)} />
              </label>
              <label>
                <span>Button style</span>
                <select value={button.style} onChange={(event) => updateButton(index, 'style', Number(event.target.value) as MessageButtonStyle)}>
                  {buttonStyles.map((style) => <option key={style.value} value={style.value}>{style.label}</option>)}
                </select>
              </label>
              <button type="button" className="remove-button" onClick={() => removeButton(index)} aria-label={`Remove button ${index + 1}`}>Remove</button>
            </div>
          ))}
        </section>

        <section className="editor-section send-section" aria-labelledby="send-title">
          <div className="section-heading">
            <div>
              <h2 id="send-title">Send to Mezon</h2>
              <p>Deliver this draft directly to a Channel Webhook.</p>
            </div>
          </div>
          <form className="send-form" onSubmit={submitWebhook}>
            <label>
              <span>Channel webhook URL</span>
              <input type="password" value={webhookUrl} onChange={(event) => setWebhookUrl(event.target.value)} autoComplete="off" required />
            </label>
            <p className="session-note">This URL is session-only and is never saved or exported.</p>
            <button className="add-button" type="submit" disabled={isSending}>{isSending ? 'Sending…' : 'Send message'}</button>
          </form>
          {sendStatus && <p className={sendStatus.kind === 'error' ? 'form-alert' : 'send-success'} role={sendStatus.kind === 'error' ? 'alert' : 'status'}>{sendStatus.message}</p>}
        </section>
      </section>

      <section className="preview-panel" aria-labelledby="preview-title">
        <div className="preview-heading">
          <p className="eyebrow">Live preview</p>
          <h2 id="preview-title">Mezon message</h2>
        </div>
        <div className="message-preview" data-testid="message-preview">
          {draft.body && <p className="message-body">{draft.body}</p>}
          <article className="embed-card" style={{ '--card-color': draft.card.color } as React.CSSProperties}>
            <div className="embed-rail" />
            {draft.card.author && <p className="embed-author">{draft.card.author}</p>}
            {draft.card.title && <h3 className="embed-title">{draft.card.title}</h3>}
            {draft.card.description && <p className="embed-description">{draft.card.description}</p>}
            {fieldRows.length > 0 && (
              <div className="embed-fields">
                {fieldRows.map((row, rowIndex) => (
                  <div className={`embed-fields-row embed-fields-row--${row.length}`} key={rowIndex}>
                    {row.map((field, fieldIndex) => (
                      <div className="embed-field" key={`${rowIndex}-${fieldIndex}`}>
                        <strong>{field.name || 'Untitled field'}</strong>
                        <span>{field.value || 'Field value'}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
            {draft.card.thumbnail && <img className="embed-thumbnail" src={draft.card.thumbnail} alt="Card thumbnail" />}
            {draft.card.image && <img className="embed-image" src={draft.card.image} alt="Card image" />}
          </article>
          {draft.buttons.length > 0 && (
            <div className="preview-actions" aria-label="Message actions">
              {draft.buttons.map((button) => <button type="button" className={actionClass(button.style)} key={button.id}>{button.label}</button>)}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default App;
