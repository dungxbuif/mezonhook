import { useMemo, useState } from 'react';

type PayloadWorkbenchProps = { value: string; error: string | null; webhookUrl?: string; onChange: (value: string) => void };

function makeSamples(value: string, webhookUrl?: string) {
  let payload = value;
  let message = '{}';
  try { const parsed = JSON.parse(value); payload = JSON.stringify(parsed, null, 2); message = JSON.stringify(parsed.message ?? {}, null, 2); } catch { /* preserve raw editor content */ }
  const target = webhookUrl || 'https://webhook.mezon.ai/webhooks/{channelId}/{token}';
  const shellPayload = payload.replace(/'/g, "'\\''");
  return {
    curl: `curl --location '${target}' \\\n+  --header 'Content-Type: application/json' \\\n+  --data-raw '${shellPayload}'`,
    bot: `import { MezonClient } from 'mezon-sdk';\n\n// Use an authenticated Bot SDK client and a resolved TextChannel.\nawait channel.send(${message});`,
  };
}

export function PayloadWorkbench({ value, error, webhookUrl, onChange }: PayloadWorkbenchProps) {
  const samples = useMemo(() => makeSamples(value, webhookUrl), [value, webhookUrl]);
  const [copied, setCopied] = useState<string | null>(null);
  const copy = async (kind: 'cURL' | 'JS Bot SDK', text: string) => { await navigator.clipboard?.writeText(text); setCopied(kind); };
  return <section className="builder-section payload-workbench" aria-labelledby="payload-title">
    <p className="eyebrow">Channel Webhook</p><h2 id="payload-title">Live payload</h2>
    <p className="editor-intro">This is the exact JSON sent in this browser session. Edit it directly; valid JSON is sent unchanged.</p><p className="editor-intro">Keep message.t as plain text. Use mk, mentions, and hg ranges for formatting—do not put [pre], [lk], or [mention] markers in t.</p>
    <label><span>Live payload</span><textarea aria-label="Live payload" value={value} onChange={(event) => onChange(event.target.value)} rows={18} spellCheck={false} /></label>
    {error ? <p className="form-alert" role="alert">{error}</p> : <p className="send-success">Valid Channel Webhook payload. Supported message fields: t, mk, mentions, images, hg.</p>}
    <div className="code-samples" aria-label="Code samples"><h3>Code sample</h3><p>Generated from the current live payload. The cURL URL is only included while it exists in this browser session.</p><div className="code-sample"><div><strong>Channel Webhook cURL</strong><button type="button" className="secondary-button" onClick={() => void copy('cURL', samples.curl)}>Copy cURL</button></div><pre><code>{samples.curl}</code></pre></div><div className="code-sample"><div><strong>Mezon JavaScript Bot SDK</strong><button type="button" className="secondary-button" onClick={() => void copy('JS Bot SDK', samples.bot)}>Copy JS Bot SDK</button></div><pre><code>{samples.bot}</code></pre></div>{copied && <p className="send-success" role="status">Copied {copied} sample.</p>}</div>
    <details className="payload-note"><summary>Why embeds and buttons are not here</summary><p>InteractiveBuilder and ButtonBuilder belong to the authenticated Mezon Bot SDK. A Channel Webhook accepts the documented HTTP message payload above and cannot run click handlers from this frontend-only app.</p></details>
  </section>;
}
