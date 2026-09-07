import { type DragEvent } from 'react';
import type { MessageDraft } from '@mezonhook/schema';
import { MessageEditor } from './MessageEditor';
import { MessagePreview } from './MessagePreview';

type BuilderTab = 'editor' | 'preview';

type ProjectEditorProps = {
  projectName: string; messages: MessageDraft[]; activeTab: BuilderTab; draggingIndex: number | null;
  onProjectNameChange: (name: string) => void; onTabChange: (tab: BuilderTab) => void;
  onMessageChange: (index: number, update: (current: MessageDraft) => MessageDraft) => void;
  onAddMessage: () => void; onDuplicateMessage: (index: number) => void; onRemoveMessage: (index: number) => void;
  onDragStart: (index: number, event: DragEvent<HTMLElement>) => void; onDragOver: (event: DragEvent<HTMLElement>) => void; onDrop: (index: number, event: DragEvent<HTMLElement>) => void; onDragEnd: () => void;
};

export function ProjectEditor({ projectName, messages, activeTab, draggingIndex, onProjectNameChange, onTabChange, onMessageChange, onAddMessage, onDuplicateMessage, onRemoveMessage, onDragStart, onDragOver, onDrop, onDragEnd }: ProjectEditorProps) {
  return <div data-testid="project-editor" data-builder-layout="two-pane-sequence">
    <div className="builder-mobile-tabs bg-theme-setting-nav border-b-theme-primary" role="tablist" aria-label="Builder panes">
      <button type="button" role="tab" aria-selected={activeTab === 'editor'} className={activeTab === 'editor' ? 'mobile-pane-tab mobile-pane-tab--active bg-item-msg-selected' : 'mobile-pane-tab bg-item-hover'} onClick={() => onTabChange('editor')}>Editor</button>
      <button type="button" role="tab" aria-selected={activeTab === 'preview'} className={activeTab === 'preview' ? 'mobile-pane-tab mobile-pane-tab--active bg-item-msg-selected' : 'mobile-pane-tab bg-item-hover'} onClick={() => onTabChange('preview')}>Preview</button>
    </div>
    <div className={`disco-builder disco-builder--${activeTab}`}>
      <section className="editor-pane bg-theme-primary" aria-label="Message editors"><div className="pane-scroll">
        <div className="builder-project-heading"><p className="eyebrow">Builder</p><label className="project-name"><span>Project name</span><input className="bg-theme-input-primary border-theme-primary" value={projectName} onChange={(event) => onProjectNameChange(event.target.value)} /></label></div>
        {messages.map((message, index) => <MessageEditor key={`editor-message-${index}`} draft={message} index={index} dragging={draggingIndex === index} canDuplicate={messages.length < 20} canRemove={messages.length > 1} onChange={(update) => onMessageChange(index, update)} onDuplicate={() => onDuplicateMessage(index)} onRemove={() => onRemoveMessage(index)} onDragStart={(event) => onDragStart(index, event)} onDragOver={onDragOver} onDrop={(event) => onDrop(index, event)} onDragEnd={onDragEnd} />)}
        <button type="button" className="add-message-wide bg-item-hover border-theme-primary" onClick={onAddMessage} disabled={messages.length >= 20}>Add Message</button>
      </div></section>
      <section className="preview-pane bg-theme-direct-message border-left-theme-primary" aria-labelledby="preview-title"><div className="pane-scroll"><div className="preview-heading"><p className="eyebrow">Sequence preview</p><h2 id="preview-title">Messages send in this order</h2></div><div className="sequence-preview">{messages.map((message, index) => <MessagePreview key={`preview-message-${index}`} draft={message} index={index} />)}</div></div></section>
    </div>
  </div>;
}
