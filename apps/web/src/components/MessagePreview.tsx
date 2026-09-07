import type { CSSProperties } from 'react';
import type { MessageButtonStyle, MessageDraft } from '@mezonhook/schema';

const buttonStyleNames: Record<MessageButtonStyle, string> = {
  1: 'primary', 2: 'secondary', 3: 'success', 4: 'danger', 5: 'link',
};

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
      {rows.length > 0 && <div className="embed-fields">{rows.map((row, rowIndex) => <div className={`embed-fields-row embed-fields-row--${row.length}`} key={rowIndex}>{row.map((field, fieldIndex) => <div className="embed-field" key={`${rowIndex}-${fieldIndex}`}><strong>{field.name || 'Untitled field'}</strong><span>{field.value || 'Field value'}</span></div>)}</div>)}</div>}
      {draft.card.thumbnail && <img className="embed-thumbnail" src={draft.card.thumbnail} alt="Card thumbnail" />}
      {draft.card.image && <img className="embed-image" src={draft.card.image} alt="Card image" />}
    </div>
    {draft.buttons.length > 0 && <div className="preview-actions" aria-label={`Message ${index + 1} actions`}>{draft.buttons.map((button) => <button type="button" className={`preview-action preview-action--${buttonStyleNames[button.style]}`} key={button.id}>{button.label}</button>)}</div>}
  </article>;
}
