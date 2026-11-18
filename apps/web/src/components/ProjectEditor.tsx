import type { ChannelWebhookMessage } from '@mezonhook/schema';
import type { ReactNode } from 'react';
import { ChannelMessageEditor } from './ChannelMessageEditor';
import { MessagePreview } from './MessagePreview';

type BuilderTab = 'editor' | 'preview';

type Props = {
  messages: ChannelWebhookMessage[];
  activeTab: BuilderTab;
  secondary: ReactNode;
  onTabChange: (tab: BuilderTab) => void;
  onMessageChange: (index: number, message: ChannelWebhookMessage) => void;
  onAddMessage: () => void;
  onDuplicateMessage: (index: number) => void;
  onRemoveMessage: (index: number) => void;
  onMoveMessage: (index: number, direction: -1 | 1) => void;
};

export function ProjectEditor({ messages, activeTab, secondary, onTabChange, onMessageChange, onAddMessage, onDuplicateMessage, onRemoveMessage, onMoveMessage }: Props) {
  return <div className="builder-workspace" data-testid="project-editor">
    <div className="builder-mobile-tabs" role="tablist" aria-label="Builder panes">
      <button type="button" role="tab" aria-selected={activeTab === 'editor'} className={activeTab === 'editor' ? 'mobile-pane-tab mobile-pane-tab--active' : 'mobile-pane-tab'} onClick={() => onTabChange('editor')}>Compose</button>
      <button type="button" role="tab" aria-selected={activeTab === 'preview'} className={activeTab === 'preview' ? 'mobile-pane-tab mobile-pane-tab--active' : 'mobile-pane-tab'} onClick={() => onTabChange('preview')}>Preview</button>
    </div>
    <div className={`composer-layout composer-layout--${activeTab}`}>
      <section id="composer" className="editor-pane" aria-labelledby="composer-title"><div className="pane-scroll">
        <header className="pane-heading"><p className="eyebrow">Channel Webhook</p><h1 id="composer-title">Compose webhook messages</h1><p>Build the documented payload visually. Preview, JSON, samples, and delivery all use this same data.</p></header>
        <div className="message-stack">{messages.map((message, index) => <ChannelMessageEditor key={`message-${index}`} message={message} index={index} canRemove={messages.length > 1} canMoveUp={index > 0} canMoveDown={index < messages.length - 1} onChange={(next) => onMessageChange(index, next)} onDuplicate={() => onDuplicateMessage(index)} onRemove={() => onRemoveMessage(index)} onMoveUp={() => onMoveMessage(index, -1)} onMoveDown={() => onMoveMessage(index, 1)} />)}</div>
        <button type="button" className="add-message-wide" onClick={onAddMessage} disabled={messages.length >= 20}>Add message</button>
        {secondary}
      </div></section>
      <section className="preview-pane" aria-labelledby="preview-title"><div className="pane-scroll"><header className="pane-heading"><p className="eyebrow">Live preview</p><h2 id="preview-title">Delivery order</h2><p>{messages.length} {messages.length === 1 ? 'message' : 'messages'} will be sent in this order.</p></header><div className="sequence-preview">{messages.map((message, index) => <MessagePreview key={`preview-${index}`} message={message} index={index} />)}</div></div></section>
    </div>
  </div>;
}
