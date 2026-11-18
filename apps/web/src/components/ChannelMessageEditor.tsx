import type { ChannelWebhookMessage } from '@mezonhook/schema';

type Props = {
  message: ChannelWebhookMessage;
  index: number;
  canRemove: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onChange: (message: ChannelWebhookMessage) => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
};

const number = (value: string) => Number.isFinite(Number(value)) ? Number(value) : 0;

export function ChannelMessageEditor({ message, index, canRemove, canMoveUp, canMoveDown, onChange, onDuplicate, onRemove, onMoveUp, onMoveDown }: Props) {
  const update = <K extends keyof ChannelWebhookMessage>(key: K, value: ChannelWebhookMessage[K]) => onChange({ ...message, [key]: value });
  const initialEnd = Math.min(1, message.t.length);
  return <article className="message-card" aria-labelledby={`message-${index}-title`}>
    <header className="message-card__header">
      <div><p className="eyebrow">Message {index + 1}</p><h2 id={`message-${index}-title`}>{message.t.slice(0, 48) || 'Empty message'}</h2></div>
      <div className="message-card__actions">
        <button type="button" className="secondary-button" aria-label={`Move message ${index + 1} up`} disabled={!canMoveUp} onClick={onMoveUp}>↑</button>
        <button type="button" className="secondary-button" aria-label={`Move message ${index + 1} down`} disabled={!canMoveDown} onClick={onMoveDown}>↓</button>
        <button type="button" className="secondary-button" aria-label={`Duplicate message ${index + 1}`} onClick={onDuplicate}>Duplicate</button>
        <button type="button" className="remove-button" aria-label={`Remove message ${index + 1}`} disabled={!canRemove} onClick={onRemove}>Remove</button>
      </div>
    </header>
    <fieldset className="message-fields" aria-label={`Message ${index + 1} fields`}>
      <label className="full-width"><span>Message text</span><textarea value={message.t} rows={5} maxLength={2000} onChange={(event) => update('t', event.target.value)} /></label>
      <p className="field-help">Ranges use zero-based start-inclusive/end-exclusive indexes in this text.</p>

      <details className="field-collection">
        <summary><span>Formatting</span><span className="collection-count">{message.mk.length}</span></summary>
        <div className="collection-body"><div className="collection-heading"><p>Preformatted and link ranges</p><button type="button" className="secondary-button" disabled={message.t.length === 0} onClick={() => update('mk', [...message.mk, { type: 'pre', s: 0, e: initialEnd }])}>Add formatting</button></div>
        {message.mk.map((entry, item) => <div className="collection-row" key={`mk-${item}`}>
          <label><span>Type</span><select aria-label={`Formatting type ${item + 1}`} value={entry.type} onChange={(event) => update('mk', message.mk.map((current, position) => position === item ? { ...current, type: event.target.value as 'pre' | 'lk' } : current))}><option value="pre">Preformatted</option><option value="lk">Link</option></select></label>
          <label><span>Start</span><input aria-label={`Formatting start ${item + 1}`} inputMode="numeric" type="number" min="0" value={entry.s} onChange={(event) => update('mk', message.mk.map((current, position) => position === item ? { ...current, s: number(event.target.value) } : current))} /></label>
          <label><span>End</span><input aria-label={`Formatting end ${item + 1}`} inputMode="numeric" type="number" min="1" value={entry.e} onChange={(event) => update('mk', message.mk.map((current, position) => position === item ? { ...current, e: number(event.target.value) } : current))} /></label>
          <button type="button" className="remove-button" aria-label={`Remove formatting ${item + 1}`} onClick={() => update('mk', message.mk.filter((_, position) => position !== item))}>Remove</button>
        </div>)}
        </div>
      </details>

      <details className="field-collection">
        <summary><span>Mentions</span><span className="collection-count">{message.mentions.length}</span></summary>
        <div className="collection-body"><div className="collection-heading"><p>Reference a user range</p><button type="button" className="secondary-button" disabled={message.t.length === 0} onClick={() => update('mentions', [...message.mentions, { user_id: '', s: 0, e: initialEnd }])}>Add mention</button></div>
        {message.mentions.map((entry, item) => {
          const mode = entry.username !== undefined ? 'username' : 'user_id';
          const identity = entry.username ?? entry.user_id ?? '';
          return <div className="collection-row" key={`mention-${item}`}>
            <label><span>Identity type</span><select aria-label={`Mention identity ${item + 1}`} value={mode} onChange={(event) => update('mentions', message.mentions.map((current, position) => position === item ? { [event.target.value]: '', s: current.s, e: current.e } : current))}><option value="user_id">User ID</option><option value="username">Username</option></select></label>
            <label><span>Identity</span><input aria-label={`Mention value ${item + 1}`} value={identity} onChange={(event) => update('mentions', message.mentions.map((current, position) => position === item ? { [mode]: event.target.value, s: current.s, e: current.e } : current))} /></label>
            <RangeInputs prefix="Mention" item={item} s={entry.s} e={entry.e} onRange={(s, e) => update('mentions', message.mentions.map((current, position) => position === item ? { ...current, s, e } : current))} />
            <button type="button" className="remove-button" aria-label={`Remove mention ${item + 1}`} onClick={() => update('mentions', message.mentions.filter((_, position) => position !== item))}>Remove</button>
          </div>;
        })}
        </div>
      </details>

      <details className="field-collection">
        <summary><span>Images</span><span className="collection-count">{message.images.length}</span></summary>
        <div className="collection-body"><div className="collection-heading"><p>Attach HTTPS image metadata</p><button type="button" className="secondary-button" onClick={() => update('images', [...message.images, { fn: '', sz: 0, url: '', ft: 'image/png', w: 0, h: 0 }])}>Add image</button></div>
        {message.images.map((entry, item) => <div className="collection-row collection-row--image" key={`image-${item}`}>
          <label><span>Image URL</span><input aria-label={`Image URL ${item + 1}`} type="url" value={entry.url} onChange={(event) => update('images', message.images.map((current, position) => position === item ? { ...current, url: event.target.value } : current))} /></label>
          {(['fn', 'ft', 'sz', 'w', 'h'] as const).map((key) => <label key={key}><span>{key}</span><input aria-label={`Image ${key} ${item + 1}`} value={entry[key]} type={['sz', 'w', 'h'].includes(key) ? 'number' : 'text'} onChange={(event) => update('images', message.images.map((current, position) => position === item ? { ...current, [key]: ['sz', 'w', 'h'].includes(key) ? number(event.target.value) : event.target.value } : current))} /></label>)}
          <button type="button" className="remove-button" aria-label={`Remove image ${item + 1}`} onClick={() => update('images', message.images.filter((_, position) => position !== item))}>Remove</button>
        </div>)}
        </div>
      </details>

      <details className="field-collection">
        <summary><span>Channel references</span><span className="collection-count">{message.hg.length}</span></summary>
        <div className="collection-body"><div className="collection-heading"><p>Reference a Mezon channel range</p><button type="button" className="secondary-button" disabled={message.t.length === 0} onClick={() => update('hg', [...message.hg, { channelId: '', s: 0, e: initialEnd }])}>Add channel reference</button></div>
        {message.hg.map((entry, item) => <div className="collection-row" key={`hg-${item}`}>
          <label><span>Channel ID</span><input aria-label={`Channel ID ${item + 1}`} value={entry.channelId} onChange={(event) => update('hg', message.hg.map((current, position) => position === item ? { ...current, channelId: event.target.value } : current))} /></label>
          <RangeInputs prefix="Channel" item={item} s={entry.s} e={entry.e} onRange={(s, e) => update('hg', message.hg.map((current, position) => position === item ? { ...current, s, e } : current))} />
          <button type="button" className="remove-button" aria-label={`Remove channel reference ${item + 1}`} onClick={() => update('hg', message.hg.filter((_, position) => position !== item))}>Remove</button>
        </div>)}
        </div>
      </details>
    </fieldset>
  </article>;
}

function RangeInputs({ prefix, item, s, e, onRange }: { prefix: string; item: number; s: number; e: number; onRange: (s: number, e: number) => void }) {
  return <><label><span>Start</span><input aria-label={`${prefix} start ${item + 1}`} type="number" min="0" value={s} onChange={(event) => onRange(number(event.target.value), e)} /></label><label><span>End</span><input aria-label={`${prefix} end ${item + 1}`} type="number" min="1" value={e} onChange={(event) => onRange(s, number(event.target.value))} /></label></>;
}
