import type { ChannelWebhookEnvelope } from '@mezonhook/schema';
import { useMemo, useState } from 'react';
import { makeCodeSamples } from '../code-samples';

type Props = { value: string; error: string | null; webhookUrl?: string; onChange: (value: string) => void };

export function PayloadWorkbench({ value, error, webhookUrl, onChange }: Props) {
  const sampleState = useMemo(() => {
    if (error) return { samples: null, validationError: null };
    try { return { samples: makeCodeSamples(JSON.parse(value) as ChannelWebhookEnvelope, webhookUrl), validationError: null }; }
    catch (caught) { return { samples: null, validationError: caught instanceof Error ? caught.message : 'This message is invalid.' }; }
  }, [value, error, webhookUrl]);
  const samples = sampleState.samples;
  const [copied, setCopied] = useState<string | null>(null);
  const copy = async (kind: string, text: string) => { await navigator.clipboard?.writeText(text); setCopied(kind); };
  return <section className="payload-workbench" aria-labelledby="payload-title">
    <header className="section-heading"><div><p className="eyebrow">Inspected message</p><h2 id="payload-title">Live payload</h2></div></header>
    <p className="editor-intro">This is the exact envelope sent for the selected message. Valid JSON updates the visual form; invalid JSON preserves the last valid message and disables delivery.</p>
    <label><span>Live payload</span><textarea aria-label="Live payload" value={value} onChange={(event) => onChange(event.target.value)} rows={16} spellCheck={false} /></label>
    {error ? <p className="form-alert" role="alert">{error}</p> : sampleState.validationError ? <p className="form-alert" role="alert">{sampleState.validationError}</p> : <p className="send-success" role="status">Valid payload: t, mk, mentions, images, and hg.</p>}
    {samples && <div className="code-samples" aria-label="Code samples">
      <h3>Runnable samples</h3><p>Generated from this same validated message. Bot credentials come only from environment variables.</p>
      <div className="code-sample"><div><strong>Channel Webhook cURL</strong><button type="button" className="secondary-button" onClick={() => void copy('cURL', samples.curl)}>Copy cURL</button></div><pre><code>{samples.curl}</code></pre></div>
      <div className="code-sample"><div><strong>Mezon JavaScript Bot SDK</strong><button type="button" className="secondary-button" onClick={() => void copy('JS Bot SDK', samples.bot)}>Copy JS Bot SDK</button></div><pre><code>{samples.bot}</code></pre></div>
      {copied && <p className="send-success" role="status">Copied {copied} sample.</p>}
    </div>}
    <details className="payload-note"><summary>Bot-only interactive messages</summary><p>Embeds, buttons, inputs, selects, radio controls, and date pickers require an authenticated Bot SDK process. They are verified separately and are not presented as Channel Webhook controls.</p></details>
  </section>;
}
