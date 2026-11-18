import { normalizeProject, validateProject, type WebhookProject } from '@mezonhook/schema';
import { useEffect, useMemo, useState } from 'react';
import { makeBotProjectSample } from '../bot-code-samples';
import { copyText } from '../clipboard';

export function BotPayloadWorkbench({ project }: { project: WebhookProject }) {
  const output = useMemo(() => {
    const validation = validateProject(project);
    if (!validation.valid) return { json: JSON.stringify(project, null, 2), code: '', error: validation.errors.join(' ') };
    const normalized = normalizeProject(project);
    return { json: JSON.stringify(normalized, null, 2), code: makeBotProjectSample(normalized), error: '' };
  }, [project]);
  const [copyStatus, setCopyStatus] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);
  useEffect(() => setCopyStatus(null), [output.json, output.code]);
  const copy = async (label: string, text: string) => {
    setCopyStatus(null);
    try { await copyText(text); setCopyStatus({ kind: 'success', message: `Copied ${label}.` }); }
    catch (error) { setCopyStatus({ kind: 'error', message: error instanceof Error ? error.message : 'Clipboard access was blocked.' }); }
  };
  return <section className="bot-payload-workbench builder-section" aria-labelledby="bot-payload-title">
    <div className="section-heading"><div><p className="eyebrow">Server-side output</p><h2 id="bot-payload-title">Generated Bot SDK JavaScript</h2></div></div>
    <p className="editor-intro">The browser generates code only. Bot ID, token, and channel ID stay in environment variables in the process that runs this sample.</p>
    {output.error && <p className="form-alert" role="alert">{output.error}</p>}
    <div className="code-sample"><div><strong>Version 2 project JSON</strong><button type="button" className="secondary-button" onClick={() => void copy('Bot project JSON', output.json)}>Copy JSON</button></div><pre><code>{output.json}</code></pre></div>
    {output.code && <div className="code-sample"><div><strong>Runnable Mezon Bot SDK sender</strong><button type="button" className="secondary-button" onClick={() => void copy('Bot SDK JavaScript', output.code)}>Copy Bot SDK JavaScript</button></div><pre><code>{output.code}</code></pre></div>}
    <p className="bot-handler-note">Generated code sends every message and component, but it does not register click or submission handlers. Add those handlers in your Bot SDK application.</p>
    {copyStatus && <p className={copyStatus.kind === 'success' ? 'send-success' : 'form-alert'} role={copyStatus.kind === 'success' ? 'status' : 'alert'}>{copyStatus.message}</p>}
  </section>;
}
