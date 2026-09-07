import type { CSSProperties } from 'react';
import type { MessageButtonStyle, MessageDraft, MessageField } from '@mezonhook/schema';

const buttonStyleNames: Record<MessageButtonStyle, string> = {
  1: 'primary', 2: 'secondary', 3: 'success', 4: 'danger', 5: 'link',
};

function InteractivePreview({ field }: { field: MessageField }) {
  const inputs = field.inputs;
  if (!inputs) return null;

  if (inputs.type === 3) {
    const component = inputs.component;
    return <div className="interactive-preview" data-testid={`interactive-preview-${inputs.type}`}>
      {component.textarea
        ? <textarea aria-label={field.name || 'Input'} placeholder={component.placeholder} defaultValue={String(component.defaultValue ?? '')} disabled={component.disabled} rows={3} />
        : <input aria-label={field.name || 'Input'} type={component.type || 'text'} placeholder={component.placeholder} defaultValue={String(component.defaultValue ?? '')} disabled={component.disabled} />}
    </div>;
  }

  if (inputs.type === 2) return <div className="interactive-preview" data-testid={`interactive-preview-${inputs.type}`}><select aria-label={field.name || 'Select'} defaultValue={inputs.component.valueSelected}>{inputs.component.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>;
  if (inputs.type === 5) return <fieldset className="interactive-preview interactive-radio" data-testid={`interactive-preview-${inputs.type}`}><legend>{field.name || 'Choose an option'}</legend>{inputs.component.map((option) => <label key={option.value}><input type="radio" name={inputs.id} value={option.value} disabled={option.disabled} />{option.label}{option.description && <span>{option.description}</span>}</label>)}</fieldset>;
  if (inputs.type === 4) return <div className="interactive-preview" data-testid={`interactive-preview-${inputs.type}`}><input aria-label={field.name || 'Date'} type="date" /></div>;

  return <div className="interactive-preview interactive-animation" data-testid={`interactive-preview-${inputs.type}`}>{inputs.component.url_image ? <img src={inputs.component.url_image} alt={field.name || 'Animation'} /> : <span>Animation preview</span>}<small>{inputs.component.pool.length} animation pool item{inputs.component.pool.length === 1 ? '' : 's'}</small></div>;
}

export function MessagePreview({ draft, index }: { draft: MessageDraft; index: number }) {
  const rows: MessageDraft['card']['fields'][] = [];
  for (const field of draft.card.fields) {
    const row = rows.at(-1);
    if (field.inline && row?.[0]?.inline && row.length < 3) row.push(field);
    else rows.push([field]);
  }

  return <article className="sequence-message" data-testid="message-preview" aria-label={`Message ${index + 1}`}>
    <p className="sequence-label">Message {index + 1}</p>
    {draft.body && <p className="message-body">{draft.body}</p>}
    <div className="embed-card" style={{ '--card-color': draft.card.color } as CSSProperties}>
      <div className="embed-rail" />
      {draft.card.author && <p className="embed-author">{draft.card.author}</p>}
      {draft.card.title && <h3 className="embed-title">{draft.card.title}</h3>}
      {draft.card.description && <p className="embed-description">{draft.card.description}</p>}
      {rows.length > 0 && <div className="embed-fields">{rows.map((row, rowIndex) => <div className={`embed-fields-row embed-fields-row--${row.length}`} key={rowIndex}>{row.map((field, fieldIndex) => <div className="embed-field" key={`${rowIndex}-${fieldIndex}`}><strong>{field.name || 'Untitled field'}</strong>{field.value && <span>{field.value}</span>}<InteractivePreview field={field} /></div>)}</div>)}</div>}
      {draft.card.thumbnail && <img className="embed-thumbnail" src={draft.card.thumbnail} alt="Card thumbnail" />}
      {draft.card.image && <img className="embed-image" src={draft.card.image} alt="Card image" />}
    </div>
    {draft.buttons.length > 0 && <div className="preview-actions" aria-label={`Message ${index + 1} actions`}>{draft.buttons.map((button) => <button type="button" className={`preview-action preview-action--${buttonStyleNames[button.style]}`} key={button.id}>{button.label}</button>)}</div>}
  </article>;
}
