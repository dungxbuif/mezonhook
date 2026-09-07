import { useState, type DragEvent, type ReactNode } from 'react';
import type { MessageButtonStyle, MessageDraft, MessageField, MessageFieldInputs, RadioFieldOption, SelectFieldOption } from '@mezonhook/schema';

const MAX_FIELDS = 25;
const MAX_BUTTONS = 5;
type SectionName = 'content' | 'embeds' | 'fields' | 'components' | 'advanced';
type InteractiveType = MessageFieldInputs['type'];

const styles: Array<{ value: MessageButtonStyle; label: string }> = [
  { value: 1, label: 'Primary' }, { value: 2, label: 'Secondary' }, { value: 3, label: 'Success' }, { value: 4, label: 'Danger' }, { value: 5, label: 'Link' },
];

const interactiveKinds: Array<{ type: InteractiveType; label: string }> = [
  { type: 3, label: 'Input' }, { type: 2, label: 'Select' }, { type: 5, label: 'Radio' }, { type: 4, label: 'Date picker' }, { type: 6, label: 'Animation' },
];

function createInteractiveField(type: InteractiveType, ordinal: number): MessageField {
  const id = `${interactiveKinds.find((kind) => kind.type === type)?.label.toLowerCase().replace(' ', '-') ?? 'input'}-${ordinal}`;
  const inputs: MessageFieldInputs = type === 3
    ? { id, type, component: { id: `${id}-component`, placeholder: 'Write a response', defaultValue: '', type: 'text', textarea: false, disabled: false } }
    : type === 2
      ? { id, type, component: { options: [{ label: 'New option', value: 'option-1' }] } }
      : type === 5
        ? { id, type, component: [{ label: 'New option', value: 'option-1' }], max_options: 1 }
        : type === 4
          ? { id, type, component: {} }
          : { id, type, component: { url_image: '', url_position: '', pool: [] } };

  return { name: interactiveKinds.find((kind) => kind.type === type)?.label ?? 'Interactive', value: '', inline: false, inputs };
}

type MessageEditorProps = {
  draft: MessageDraft; index: number; canDuplicate: boolean; canRemove: boolean; dragging: boolean;
  onChange: (update: (current: MessageDraft) => MessageDraft) => void;
  onDuplicate: () => void; onRemove: () => void;
  onDragStart: (event: DragEvent<HTMLElement>) => void; onDragOver: (event: DragEvent<HTMLElement>) => void; onDrop: (event: DragEvent<HTMLElement>) => void; onDragEnd: () => void;
};

export function MessageEditor({ draft, index, canDuplicate, canRemove, dragging, onChange, onDuplicate, onRemove, onDragStart, onDragOver, onDrop, onDragEnd }: MessageEditorProps) {
  const [open, setOpen] = useState<Record<SectionName, boolean>>({ content: true, embeds: false, fields: false, components: false, advanced: false });
  const toggle = (section: SectionName) => setOpen((current) => ({ ...current, [section]: !current[section] }));
  const card = (property: keyof MessageDraft['card'], value: string) => onChange((current) => ({ ...current, card: { ...current.card, [property]: value } }));
  const updateField = (fieldIndex: number, update: (field: MessageField) => MessageField) => onChange((current) => ({ ...current, card: { ...current.card, fields: current.card.fields.map((field, itemIndex) => itemIndex === fieldIndex ? update(field) : field) } }));
  const updateInputs = (fieldIndex: number, update: (inputs: MessageFieldInputs) => MessageFieldInputs) => updateField(fieldIndex, (field) => field.inputs ? { ...field, inputs: update(field.inputs) } : field);
  const section = (name: SectionName, label: string, content: ReactNode) => <section className="composer-card" key={name}><button type="button" className="composer-trigger" aria-expanded={open[name]} aria-controls={`message-${index}-${name}`} onClick={() => toggle(name)}><span>{label}</span><span aria-hidden="true">⌄</span></button>{open[name] && <div id={`message-${index}-${name}`} className="composer-card-body">{content}</div>}</section>;
  const addInteractive = (type: InteractiveType) => onChange((current) => {
    const ordinal = current.card.fields.filter((field) => field.inputs?.type === type).length + 1;
    return { ...current, card: { ...current.card, fields: [...current.card.fields, createInteractiveField(type, ordinal)] } };
  });

  const renderInteractiveEditor = (field: MessageField, fieldIndex: number) => {
    const inputs = field.inputs!;
    const updateOptions = (options: SelectFieldOption[]) => updateInputs(fieldIndex, (current) => current.type === 2 ? { ...current, component: { ...current.component, options } } : current);
    const updateRadioOptions = (component: RadioFieldOption[]) => updateInputs(fieldIndex, (current) => {
      if (current.type !== 5) return current;
      const { max_options: _maxOptions, ...rest } = current;
      return component.length > 0
        ? { ...rest, component, max_options: Math.min(_maxOptions ?? 1, component.length) }
        : { ...rest, component };
    });

    return <div className="repeat-row interactive-field-row" key={fieldIndex}>
      <div className="form-grid full-width">
        <label><span>Field label</span><input value={field.name} onChange={(event) => updateField(fieldIndex, (current) => ({ ...current, name: event.target.value }))} /></label>
        <label><span>Description</span><input value={field.value} onChange={(event) => updateField(fieldIndex, (current) => ({ ...current, value: event.target.value }))} /></label>
        <label><span>Interactive ID</span><input value={inputs.id} onChange={(event) => updateInputs(fieldIndex, (current) => ({ ...current, id: event.target.value }))} /></label>
        <label className="inline-toggle"><input type="checkbox" checked={field.inline} onChange={(event) => updateField(fieldIndex, (current) => ({ ...current, inline: event.target.checked }))} /><span>Inline</span></label>
      </div>
      {inputs.type === 3 && <div className="form-grid full-width">
        <label><span>Input component ID</span><input value={inputs.component.id} onChange={(event) => updateInputs(fieldIndex, (current) => current.type === 3 ? { ...current, component: { ...current.component, id: event.target.value } } : current)} /></label>
        <label><span>Input placeholder</span><input value={inputs.component.placeholder ?? ''} onChange={(event) => updateInputs(fieldIndex, (current) => current.type === 3 ? { ...current, component: { ...current.component, placeholder: event.target.value } } : current)} /></label>
        <label><span>Default value</span><input value={inputs.component.defaultValue ?? ''} onChange={(event) => updateInputs(fieldIndex, (current) => current.type === 3 ? { ...current, component: { ...current.component, defaultValue: event.target.value } } : current)} /></label>
        <label><span>Input type</span><input value={inputs.component.type ?? 'text'} onChange={(event) => updateInputs(fieldIndex, (current) => current.type === 3 ? { ...current, component: { ...current.component, type: event.target.value } } : current)} /></label>
        <label className="inline-toggle"><input type="checkbox" checked={inputs.component.textarea ?? false} onChange={(event) => updateInputs(fieldIndex, (current) => current.type === 3 ? { ...current, component: { ...current.component, textarea: event.target.checked } } : current)} /><span>Multiline</span></label>
        <label className="inline-toggle"><input type="checkbox" checked={inputs.component.disabled ?? false} onChange={(event) => updateInputs(fieldIndex, (current) => current.type === 3 ? { ...current, component: { ...current.component, disabled: event.target.checked } } : current)} /><span>Disabled</span></label>
      </div>}
      {inputs.type === 2 && <div className="interactive-options full-width"><label><span>Selected value</span><input value={inputs.component.valueSelected ?? ''} onChange={(event) => updateInputs(fieldIndex, (current) => current.type === 2 ? { ...current, component: { ...current.component, valueSelected: event.target.value } } : current)} /></label>{inputs.component.options.map((option, optionIndex) => <div className="option-row" key={optionIndex}><label><span>Option label</span><input value={option.label} onChange={(event) => updateOptions(inputs.component.options.map((item, itemIndex) => itemIndex === optionIndex ? { ...item, label: event.target.value } : item))} /></label><label><span>Option value</span><input value={option.value} onChange={(event) => updateOptions(inputs.component.options.map((item, itemIndex) => itemIndex === optionIndex ? { ...item, value: event.target.value } : item))} /></label><button type="button" className="remove-button" onClick={() => updateOptions(inputs.component.options.filter((_, itemIndex) => itemIndex !== optionIndex))}>Remove option</button></div>)}<button type="button" className="secondary-button" onClick={() => updateOptions([...inputs.component.options, { label: 'New option', value: `option-${inputs.component.options.length + 1}` }])}>Add option</button></div>}
      {inputs.type === 5 && <div className="interactive-options full-width"><label><span>Maximum selections</span><input type="number" min="1" max={Math.max(1, inputs.component.length)} value={inputs.max_options ?? 1} onChange={(event) => updateInputs(fieldIndex, (current) => current.type === 5 ? { ...current, max_options: Math.max(1, Math.min(current.component.length, Number(event.target.value) || 1)) } : current)} /></label>{inputs.component.map((option, optionIndex) => <div className="option-row option-row--radio" key={optionIndex}><label><span>Option label</span><input value={option.label} onChange={(event) => updateRadioOptions(inputs.component.map((item, itemIndex) => itemIndex === optionIndex ? { ...item, label: event.target.value } : item))} /></label><label><span>Option value</span><input value={option.value} onChange={(event) => updateRadioOptions(inputs.component.map((item, itemIndex) => itemIndex === optionIndex ? { ...item, value: event.target.value } : item))} /></label><label><span>Option name</span><input value={option.name ?? ''} onChange={(event) => updateRadioOptions(inputs.component.map((item, itemIndex) => itemIndex === optionIndex ? { ...item, name: event.target.value } : item))} /></label><label><span>Option description</span><input value={option.description ?? ''} onChange={(event) => updateRadioOptions(inputs.component.map((item, itemIndex) => itemIndex === optionIndex ? { ...item, description: event.target.value } : item))} /></label><label><span>Option style</span><select value={option.style ?? 1} onChange={(event) => updateRadioOptions(inputs.component.map((item, itemIndex) => itemIndex === optionIndex ? { ...item, style: Number(event.target.value) as MessageButtonStyle } : item))}>{styles.map((style) => <option key={style.value} value={style.value}>{style.label}</option>)}</select></label><label className="inline-toggle"><input type="checkbox" checked={option.disabled ?? false} onChange={(event) => updateRadioOptions(inputs.component.map((item, itemIndex) => itemIndex === optionIndex ? { ...item, disabled: event.target.checked } : item))} /><span>Disabled</span></label><button type="button" className="remove-button" onClick={() => updateRadioOptions(inputs.component.filter((_, itemIndex) => itemIndex !== optionIndex))}>Remove option</button></div>)}<button type="button" className="secondary-button" onClick={() => updateRadioOptions([...inputs.component, { label: 'New option', value: `option-${inputs.component.length + 1}` }])}>Add option</button></div>}
      {inputs.type === 4 && <p className="accordion-note full-width">Mezon renders this block as a date picker. It does not have additional documented builder fields.</p>}
      {inputs.type === 6 && <div className="form-grid full-width"><label><span>Animation image URL</span><input type="url" value={inputs.component.url_image} onChange={(event) => updateInputs(fieldIndex, (current) => current.type === 6 ? { ...current, component: { ...current.component, url_image: event.target.value } } : current)} /></label><label><span>Animation position URL</span><input type="url" value={inputs.component.url_position} onChange={(event) => updateInputs(fieldIndex, (current) => current.type === 6 ? { ...current, component: { ...current.component, url_position: event.target.value } } : current)} /></label><label className="full-width"><span>Animation pool (one value per line)</span><textarea value={inputs.component.pool.join('\n')} onChange={(event) => updateInputs(fieldIndex, (current) => current.type === 6 ? { ...current, component: { ...current.component, pool: event.target.value.split('\n').map((entry) => entry.trim()).filter(Boolean) } } : current)} rows={3} /></label><label><span>Repeat</span><input type="number" min="0" value={inputs.component.repeat ?? ''} onChange={(event) => updateInputs(fieldIndex, (current) => current.type === 6 ? { ...current, component: { ...current.component, repeat: event.target.value === '' ? undefined : Math.max(0, Number(event.target.value) || 0) } } : current)} /></label><label><span>Duration (ms)</span><input type="number" min="0" value={inputs.component.duration ?? ''} onChange={(event) => updateInputs(fieldIndex, (current) => current.type === 6 ? { ...current, component: { ...current.component, duration: event.target.value === '' ? undefined : Math.max(0, Number(event.target.value) || 0) } } : current)} /></label></div>}
      <button type="button" className="remove-button" aria-label={`Remove interactive block ${fieldIndex + 1}`} onClick={() => onChange((current) => ({ ...current, card: { ...current.card, fields: current.card.fields.filter((_, itemIndex) => itemIndex !== fieldIndex) } }))}>Remove block</button>
    </div>;
  };

  return <article className={`message-editor-card bg-theme-primary border-theme-primary ${dragging ? 'message-editor-card--dragging' : ''}`} data-testid={`message-editor-${index + 1}`}>
    <header className="message-editor-header bg-theme-direct-message border-b-theme-primary" draggable onDragStart={onDragStart} onDragOver={onDragOver} onDrop={onDrop} onDragEnd={onDragEnd}>
      <div><p className="message-editor-kicker">Message {index + 1}</p><h2>{draft.card.title || 'Untitled message'}</h2></div>
      <div className="message-editor-actions"><button type="button" className="secondary-button" onClick={onDuplicate} disabled={!canDuplicate} aria-label={`Duplicate message ${index + 1}`}>Duplicate</button><button type="button" className="remove-button" onClick={onRemove} disabled={!canRemove} aria-label={`Remove message ${index + 1}`}>Remove</button></div>
    </header>
    <div className="composer-accordion">
      {section('content', 'Content', <label className="full-width"><span>Body</span><textarea className="bg-theme-input-primary border-theme-primary" value={draft.body} onChange={(event) => onChange((current) => ({ ...current, body: event.target.value }))} rows={4} /></label>)}
      {section('embeds', 'Embeds', <><p className="accordion-note">One Mezon embed is supported for each message.</p><div className="form-grid"><label><span>Card title</span><input value={draft.card.title} onChange={(event) => card('title', event.target.value)} /></label><label><span>Color</span><input type="color" value={draft.card.color} onChange={(event) => card('color', event.target.value)} /></label><label className="full-width"><span>Description</span><textarea value={draft.card.description} onChange={(event) => card('description', event.target.value)} rows={4} /></label></div></>)}
      {section('fields', 'Fields', <><div className="section-heading"><div><h2>Fields</h2><p>{draft.card.fields.length} / {MAX_FIELDS}</p></div><button type="button" className="add-button" disabled={draft.card.fields.length >= MAX_FIELDS} onClick={() => onChange((current) => ({ ...current, card: { ...current.card, fields: [...current.card.fields, { name: '', value: '', inline: false }] } }))}>Add field</button></div><div className="interactive-additions" aria-label="Add documented interactive field">{interactiveKinds.map((kind) => <button key={kind.type} type="button" className="secondary-button" disabled={draft.card.fields.length >= MAX_FIELDS} onClick={() => addInteractive(kind.type)}>Add {kind.label}</button>)}</div>{draft.card.fields.map((field, fieldIndex) => field.inputs ? renderInteractiveEditor(field, fieldIndex) : <div className="repeat-row" key={fieldIndex}><label><span>Field name</span><input value={field.name} onChange={(event) => updateField(fieldIndex, (current) => ({ ...current, name: event.target.value }))} /></label><label><span>Field value</span><input value={field.value} onChange={(event) => updateField(fieldIndex, (current) => ({ ...current, value: event.target.value }))} /></label><label className="inline-toggle"><input type="checkbox" checked={field.inline} onChange={(event) => updateField(fieldIndex, (current) => ({ ...current, inline: event.target.checked }))} /><span>Inline</span></label><button type="button" className="remove-button" aria-label={`Remove field ${fieldIndex + 1}`} onClick={() => onChange((current) => ({ ...current, card: { ...current.card, fields: current.card.fields.filter((_, itemIndex) => itemIndex !== fieldIndex) } }))}>Remove</button></div>)}</>)}
      {section('components', 'Components', <><div className="section-heading"><div><h2>Actions</h2><p>{draft.buttons.length} / {MAX_BUTTONS}</p></div><button type="button" className="add-button" disabled={draft.buttons.length >= MAX_BUTTONS} onClick={() => onChange((current) => ({ ...current, buttons: [...current.buttons, { id: `button-${current.buttons.length + 1}`, label: 'New button', style: 2 }] }))}>Add button</button></div>{draft.buttons.map((button, buttonIndex) => <div className="repeat-row button-row" key={buttonIndex}><label><span>Button label</span><input value={button.label} onChange={(event) => onChange((current) => ({ ...current, buttons: current.buttons.map((item, itemIndex) => itemIndex === buttonIndex ? { ...item, label: event.target.value } : item) }))} /></label><label><span>Button ID</span><input value={button.id} onChange={(event) => onChange((current) => ({ ...current, buttons: current.buttons.map((item, itemIndex) => itemIndex === buttonIndex ? { ...item, id: event.target.value } : item) }))} /></label><label><span>Button style</span><select value={button.style} onChange={(event) => onChange((current) => ({ ...current, buttons: current.buttons.map((item, itemIndex) => itemIndex === buttonIndex ? { ...item, style: Number(event.target.value) as MessageButtonStyle } : item) }))}>{styles.map((style) => <option key={style.value} value={style.value}>{style.label}</option>)}</select></label><button type="button" className="remove-button" aria-label={`Remove button ${buttonIndex + 1}`} onClick={() => onChange((current) => ({ ...current, buttons: current.buttons.filter((_, itemIndex) => itemIndex !== buttonIndex) }))}>Remove</button></div>)}</>)}
      {section('advanced', 'Advanced', <div className="form-grid"><label><span>Author</span><input value={draft.card.author} onChange={(event) => card('author', event.target.value)} /></label><label><span>Thumbnail URL</span><input type="url" value={draft.card.thumbnail} onChange={(event) => card('thumbnail', event.target.value)} placeholder="https://" /></label><label className="full-width"><span>Image URL</span><input type="url" value={draft.card.image} onChange={(event) => card('image', event.target.value)} placeholder="https://" /></label></div>)}
    </div>
  </article>;
}
