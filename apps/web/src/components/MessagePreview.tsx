import type { ChannelWebhookMessage } from '@mezonhook/schema';
import { renderWebhookText } from '../rich-text';

export function MessagePreview({ message, index }: { message: ChannelWebhookMessage; index: number }) {
  return <article className="sequence-message webhook-preview mezon-preview-context" aria-label={`Message ${index + 1} preview`}>
    <p className="sequence-label">Message {index + 1}</p>
    <div className="mezon-message-row">
      <div className="mezon-message-avatar" aria-hidden="true">M</div>
      <div className="mezon-message-content">
        <div className="mezon-message-meta"><strong>MezonHook</strong><span className="mezon-bot-badge">BOT</span><span>Today at 12:00</span></div>
        <p className="message-body mezon-message-body">{message.t ? renderWebhookText(message) : 'Nothing to preview yet.'}</p>
        {message.images.map((image, position) => image.url && <figure className="mezon-attachment" key={`${image.url}-${position}`}><img className="preview-image" src={image.url} width={image.w || undefined} height={image.h || undefined} alt={image.fn || `Attached image ${position + 1}`} /><figcaption>{image.fn || `Attached image ${position + 1}`} · {image.w}×{image.h}</figcaption></figure>)}
      </div>
    </div>
    {(message.mk.length > 0 || message.mentions.length > 0 || message.hg.length > 0) && <details className="preview-diagnostics"><summary>Payload range diagnostics</summary><dl className="preview-metadata">
      {message.mk.length > 0 && <><dt>Formatting</dt><dd>{message.mk.map((entry) => `${entry.type} ${entry.s}–${entry.e}`).join(', ')}</dd></>}
      {message.mentions.length > 0 && <><dt>Mentions</dt><dd>{message.mentions.map((entry) => `${entry.username ?? entry.user_id} ${entry.s}–${entry.e}`).join(', ')}</dd></>}
      {message.hg.length > 0 && <><dt>Channels</dt><dd>{message.hg.map((entry) => `${entry.channelId} ${entry.s}–${entry.e}`).join(', ')}</dd></>}
    </dl></details>}
  </article>;
}
