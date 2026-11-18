import type { ChannelWebhookMessage } from '@mezonhook/schema';

export function MessagePreview({ message, index }: { message: ChannelWebhookMessage; index: number }) {
  return <article className="sequence-message webhook-preview" aria-label={`Message ${index + 1} preview`}>
    <p className="sequence-label">Message {index + 1}</p>
    <p className="message-body">{message.t || 'Nothing to preview yet.'}</p>
    {message.images.map((image, position) => image.url && <img className="preview-image" src={image.url} width={image.w || undefined} height={image.h || undefined} alt={image.fn || `Attached image ${position + 1}`} key={`${image.url}-${position}`} />)}
    {(message.mk.length > 0 || message.mentions.length > 0 || message.hg.length > 0) && <dl className="preview-metadata">
      {message.mk.length > 0 && <><dt>Formatting</dt><dd>{message.mk.map((entry) => `${entry.type} ${entry.s}–${entry.e}`).join(', ')}</dd></>}
      {message.mentions.length > 0 && <><dt>Mentions</dt><dd>{message.mentions.map((entry) => `${entry.username ?? entry.user_id} ${entry.s}–${entry.e}`).join(', ')}</dd></>}
      {message.hg.length > 0 && <><dt>Channels</dt><dd>{message.hg.map((entry) => `${entry.channelId} ${entry.s}–${entry.e}`).join(', ')}</dd></>}
    </dl>}
  </article>;
}
