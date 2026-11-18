import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { ChannelWebhookMessage } from '@mezonhook/schema';
import { afterEach, describe, expect, it } from 'vitest';
import { renderWebhookText } from './rich-text';

const message = (t: string, overrides: Partial<ChannelWebhookMessage> = {}): ChannelWebhookMessage => ({
  t,
  mk: [],
  mentions: [],
  images: [],
  hg: [],
  ...overrides,
});

const RichText = ({ value }: { value: ChannelWebhookMessage }) => <p>{renderWebhookText(value)}</p>;

afterEach(cleanup);

describe('webhook rich text renderer', () => {
  it('renders preformatted ranges as code', () => {
    render(<RichText value={message('Deploy v2.4.0 now', { mk: [{ type: 'pre', s: 7, e: 13 }] })} />);
    expect(screen.getByText('v2.4.0').tagName).toBe('CODE');
  });

  it('renders HTTPS link ranges as safe anchors', () => {
    const url = 'https://mezon.ai';
    render(<RichText value={message(url, { mk: [{ type: 'lk', s: 0, e: url.length }] })} />);
    expect(screen.getByRole('link', { name: url })).toHaveAttribute('href', url);
    expect(screen.getByRole('link', { name: url })).toHaveAttribute('rel', 'noreferrer noopener');
  });

  it('styles non-HTTPS link ranges without making them navigable', () => {
    render(<RichText value={message('docs.local', { mk: [{ type: 'lk', s: 0, e: 10 }] })} />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText('docs.local')).toHaveClass('mezon-rich-link');
  });

  it('renders mentions and channels with accessible semantic labels', () => {
    const text = '@demo-ops report in #demo-alerts';
    render(<RichText value={message(text, {
      mentions: [{ username: 'demo-ops', s: 0, e: 9 }],
      hg: [{ channelId: 'demo-alerts', s: 20, e: 32 }],
    })} />);
    expect(screen.getByLabelText('Mention demo-ops')).toHaveTextContent('@demo-ops');
    expect(screen.getByLabelText('Channel demo-alerts')).toHaveTextContent('#demo-alerts');
  });

  it('uses mention then code then link precedence without nested anchors', () => {
    const text = 'https://mezon.ai';
    render(<RichText value={message(text, {
      mk: [{ type: 'lk', s: 0, e: text.length }, { type: 'pre', s: 0, e: text.length }],
      mentions: [{ username: 'demo', s: 8, e: 13 }],
    })} />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Mention demo')).toHaveTextContent('mezon');
    expect(screen.getAllByText(/https:\/\/|\.ai/).every((node) => node.tagName === 'CODE')).toBe(true);
    expect(document.querySelector('a a')).toBeNull();
  });

  it('clamps invalid temporary ranges for rendering without mutating the message', () => {
    const source = message('temporary', { mk: [{ type: 'pre', s: -12, e: 99 }] });
    const snapshot = structuredClone(source);
    expect(() => render(<RichText value={source} />)).not.toThrow();
    expect(screen.getByText('temporary').tagName).toBe('CODE');
    expect(source).toEqual(snapshot);
  });
});
