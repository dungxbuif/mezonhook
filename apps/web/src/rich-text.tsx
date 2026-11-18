import type { ChannelWebhookMessage } from '@mezonhook/schema';
import type { ReactNode } from 'react';

type Semantic =
  | { kind: 'mention'; s: number; e: number; label: string }
  | { kind: 'channel'; s: number; e: number; label: string }
  | { kind: 'pre'; s: number; e: number }
  | { kind: 'link'; s: number; e: number; href?: string };

const clampRange = (s: number, e: number, length: number) => ({
  s: Math.max(0, Math.min(length, Number.isFinite(s) ? Math.trunc(s) : 0)),
  e: Math.max(0, Math.min(length, Number.isFinite(e) ? Math.trunc(e) : 0)),
});

const safeHttpsUrl = (value: string): string | undefined => {
  try { return new URL(value).protocol === 'https:' ? value : undefined; }
  catch { return undefined; }
};

export function renderWebhookText(message: ChannelWebhookMessage): ReactNode {
  const length = message.t.length;
  const semantics: Semantic[] = [];
  const add = (semantic: Semantic) => { if (semantic.s < semantic.e) semantics.push(semantic); };
  for (const entry of message.mentions) {
    const range = clampRange(entry.s, entry.e, length);
    add({ kind: 'mention', ...range, label: entry.username ?? entry.user_id ?? 'unknown user' });
  }
  for (const entry of message.hg) {
    const range = clampRange(entry.s, entry.e, length);
    add({ kind: 'channel', ...range, label: entry.channelId || 'unknown channel' });
  }
  for (const entry of message.mk) {
    const range = clampRange(entry.s, entry.e, length);
    if (entry.type === 'pre') add({ kind: 'pre', ...range });
    else add({ kind: 'link', ...range, href: safeHttpsUrl(message.t.slice(range.s, range.e)) });
  }

  const boundaries = [...new Set([0, length, ...semantics.flatMap((entry) => [entry.s, entry.e])])].sort((a, b) => a - b);
  const priority = (kind: Semantic['kind']) => kind === 'mention' ? 4 : kind === 'channel' ? 3 : kind === 'pre' ? 2 : 1;
  return boundaries.slice(0, -1).map((start, index) => {
    const end = boundaries[index + 1];
    const text = message.t.slice(start, end);
    const semantic = semantics
      .filter((entry) => entry.s <= start && entry.e >= end)
      .sort((left, right) => priority(right.kind) - priority(left.kind))[0];
    const key = `${start}-${end}`;
    if (!semantic) return text;
    if (semantic.kind === 'mention') return <span key={key} className="mezon-mention" aria-label={`Mention ${semantic.label}`}>{text}</span>;
    if (semantic.kind === 'channel') return <span key={key} className="mezon-channel" aria-label={`Channel ${semantic.label}`}>{text}</span>;
    if (semantic.kind === 'pre') return <code key={key} className="mezon-inline-code">{text}</code>;
    if (semantic.href) return <a key={key} className="mezon-rich-link" href={semantic.href} target="_blank" rel="noreferrer noopener">{text}</a>;
    return <span key={key} className="mezon-rich-link">{text}</span>;
  });
}
