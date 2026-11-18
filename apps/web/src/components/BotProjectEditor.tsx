import { cloneProject, createAnnouncementDraft, type MessageDraft, type WebhookProject } from '@mezonhook/schema';
import { useLayoutEffect, useRef, useState } from 'react';
import { BotMessagePreview } from './BotMessagePreview';
import { BotPayloadWorkbench } from './BotPayloadWorkbench';
import { MessageEditor } from './MessageEditor';

type BuilderTab = 'editor' | 'preview';
type Props = { project: WebhookProject; activeTab: BuilderTab; onTabChange: (tab: BuilderTab) => void; onChange: (project: WebhookProject) => void };

const cloneDraft = (draft: MessageDraft) => cloneProject({ version: 2, name: 'clone', messages: [draft], targets: [{ id: 'clone', name: 'clone' }] }).messages[0];

export function BotProjectEditor({ project, activeTab, onTabChange, onChange }: Props) {
  const previewRef = useRef<HTMLElement>(null);
  const [previewOversized, setPreviewOversized] = useState(false);
  useLayoutEffect(() => {
    const preview = previewRef.current;
    if (!preview) return;
    const update = () => setPreviewOversized(preview.scrollHeight > window.innerHeight - 56);
    update();
    window.addEventListener('resize', update);
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
    observer?.observe(preview);
    return () => { window.removeEventListener('resize', update); observer?.disconnect(); };
  }, []);
  const updateMessage = (index: number, update: (current: MessageDraft) => MessageDraft) => onChange({ ...project, messages: project.messages.map((message, position) => position === index ? update(message) : message) });
  const moveMessage = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= project.messages.length) return;
    const messages = [...project.messages];
    [messages[index], messages[target]] = [messages[target], messages[index]];
    onChange({ ...project, messages });
  };
  return <div className="builder-workspace bot-composer" data-testid="bot-project-editor">
    <div className="builder-mobile-tabs" role="tablist" aria-label="Bot builder panes">
      <button type="button" role="tab" aria-selected={activeTab === 'editor'} className={activeTab === 'editor' ? 'mobile-pane-tab mobile-pane-tab--active' : 'mobile-pane-tab'} onClick={() => onTabChange('editor')}>Compose</button>
      <button type="button" role="tab" aria-selected={activeTab === 'preview'} className={activeTab === 'preview' ? 'mobile-pane-tab mobile-pane-tab--active' : 'mobile-pane-tab'} onClick={() => onTabChange('preview')}>Preview</button>
    </div>
    <div className={`composer-layout composer-layout--${activeTab}`}>
      <section id="composer" className="editor-pane" aria-labelledby="bot-composer-title"><div className="pane-scroll">
        <header className="pane-heading"><p className="eyebrow">Bot SDK</p><h1 id="bot-composer-title">Compose authenticated bot messages</h1><p>Build embeds and interactive components visually, then run the generated JavaScript in a trusted server or local process.</p></header>
        <label className="bot-project-name"><span>Project name</span><input value={project.name} onChange={(event) => onChange({ ...project, name: event.target.value })} /></label>
        <div className="message-stack">{project.messages.map((draft, index) => <MessageEditor key={`bot-message-${index}`} draft={draft} index={index} canDuplicate={project.messages.length < 20} canRemove={project.messages.length > 1} canMoveUp={index > 0} canMoveDown={index < project.messages.length - 1} onChange={(update) => updateMessage(index, update)} onDuplicate={() => { const messages = [...project.messages]; messages.splice(index + 1, 0, cloneDraft(draft)); onChange({ ...project, messages }); }} onRemove={() => onChange({ ...project, messages: project.messages.filter((_, position) => position !== index) })} onMoveUp={() => moveMessage(index, -1)} onMoveDown={() => moveMessage(index, 1)} />)}</div>
        <button type="button" className="add-message-wide" onClick={() => onChange({ ...project, messages: [...project.messages, createAnnouncementDraft()] })} disabled={project.messages.length >= 20}>Add message</button>
        <BotPayloadWorkbench project={project} />
      </div></section>
      <section ref={previewRef} className={previewOversized ? 'preview-pane preview-pane--oversized' : 'preview-pane'} aria-labelledby="bot-preview-title"><div className="pane-scroll"><header className="pane-heading"><p className="eyebrow">Mezon-style preview</p><h2 id="bot-preview-title">Bot delivery order</h2><p>{project.messages.length} {project.messages.length === 1 ? 'message' : 'messages'} will be sent in this order.</p></header><div className="sequence-preview">{project.messages.map((draft, index) => <BotMessagePreview key={`bot-preview-${index}`} draft={draft} index={index} />)}</div></div></section>
    </div>
  </div>;
}
