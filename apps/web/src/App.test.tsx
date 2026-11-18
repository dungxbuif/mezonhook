import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from './App';

afterEach(() => {
  cleanup();
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('MezonHook reliable composer', () => {
  it('uses the visual form as the source for preview and raw JSON', async () => {
    const user = userEvent.setup();
    render(<App />);
    const input = screen.getByLabelText('Message text');
    await user.clear(input);
    await user.type(input, 'Đồng bộ một nguồn');
    expect(screen.getByRole('article', { name: 'Message 1 preview' })).toHaveTextContent('Đồng bộ một nguồn');
    await user.click(screen.getByText('Advanced JSON and code'));
    expect((screen.getByRole('textbox', { name: 'Live payload' }) as HTMLTextAreaElement).value).toContain('Đồng bộ một nguồn');
  });

  it('imports valid raw JSON back into the same visual form', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByText('Advanced JSON and code'));
    const raw = screen.getByRole('textbox', { name: 'Live payload' });
    fireEvent.change(raw, { target: { value: JSON.stringify({ type: 'hook', message: { t: 'Raw becomes form', mk: [], mentions: [], images: [], hg: [] } }) } });
    expect(screen.getByLabelText('Message text')).toHaveValue('Raw becomes form');
    expect(screen.getByRole('article', { name: 'Message 1 preview' })).toHaveTextContent('Raw becomes form');
  });

  it('preserves the last valid form and disables every send control for invalid JSON', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByText('Advanced JSON and code'));
    const raw = screen.getByRole('textbox', { name: 'Live payload' });
    fireEvent.change(raw, { target: { value: '{bad' } });
    expect(screen.getByLabelText('Message text')).toHaveValue('🚀 Release v2.4.0 is live in production.\nRunbook: https://mezonhook.dungxbuif.com/\n@demo-ops please verify API health and report in #demo-production-alerts.\nScreenshot attached for visual verification.');
    for (const button of screen.getAllByRole('button', { name: /Send/ })) expect(button).toBeDisabled();
  });

  it('starts a fresh project with a meaningful full-feature webhook demo', () => {
    render(<App />);
    expect((screen.getByLabelText('Message text') as HTMLTextAreaElement).value).toContain('Release v2.4.0 is live');
    const editor = screen.getByRole('group', { name: 'Message 1 fields' });
    expect(within(editor).getByText('Formatting').parentElement).toHaveTextContent('2');
    expect(within(editor).getByText('Mentions').parentElement).toHaveTextContent('1');
    expect(within(editor).getByText('Images').parentElement).toHaveTextContent('1');
    expect(within(editor).getByText('Channel references').parentElement).toHaveTextContent('1');
    expect(screen.getByRole('article', { name: 'Message 1 preview' })).toHaveClass('mezon-preview-context');
    expect(within(screen.getByRole('article', { name: 'Message 1 preview' })).getByRole('img')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Send to Production alerts' })).toBeChecked();
    expect(screen.getByLabelText('Webhook URL for Production alerts')).toBeInTheDocument();
  });

  it('explains invalid form content and hides runnable samples', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.clear(screen.getByLabelText('Message text'));
    await user.click(screen.getByText('Advanced JSON and code'));
    expect(screen.getByRole('alert')).toHaveTextContent('message.t');
    expect(screen.queryByText('Runnable samples')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send 1 message' })).toBeDisabled();
  });

  it('restores and selects the first target from a stored version 3 project', () => {
    localStorage.setItem('mezonhook:project:v3', JSON.stringify({
      version: 3,
      name: 'Stored',
      messages: [{ t: 'Stored message', mk: [], mentions: [], images: [], hg: [] }],
      targets: [{ id: 'target-4', name: 'Stored channel' }],
    }));
    render(<App />);
    expect(screen.getByRole('checkbox', { name: 'Send to Stored channel' })).toBeChecked();
  });

  it('provides keyboard-operable move controls in addition to drag', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Add message' }));
    const textboxes = screen.getAllByLabelText('Message text');
    await user.clear(textboxes[1]);
    await user.type(textboxes[1], 'Second first');
    await user.click(screen.getByRole('button', { name: 'Move message 2 up' }));
    expect(screen.getAllByLabelText('Message text')[0]).toHaveValue('Second first');
  });

  it('sends every project message in order through one real submit path', async () => {
    const user = userEvent.setup();
    const fetcher = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 204 }));
    localStorage.setItem('mezonhook:project:v3', JSON.stringify({
      version: 3,
      name: 'Delivery test',
      messages: [{ t: 'First', mk: [], mentions: [], images: [], hg: [] }],
      targets: [{ id: 'target-1', name: 'Production alerts' }],
    }));
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Add message' }));
    const textboxes = screen.getAllByLabelText('Message text');
    await user.clear(textboxes[1]);
    await user.type(textboxes[1], 'Second');
    await user.type(screen.getByLabelText('Webhook URL for Production alerts'), 'https://webhook.mezon.ai/webhooks/123/session-secret');
    await user.click(screen.getByRole('button', { name: 'Send 2 messages' }));
    expect(await screen.findByText('Sent 2 messages to 1 target (2 deliveries).')).toBeInTheDocument();
    expect(fetcher.mock.calls.map(([, request]) => JSON.parse((request as RequestInit).body as string).message.t)).toEqual(['First', 'Second']);
  });

  it('keeps target secrets out of persisted project data', async () => {
    const user = userEvent.setup();
    render(<App />);
    const url = screen.getByLabelText('Webhook URL for Production alerts');
    await user.type(url, 'https://webhook.mezon.ai/webhooks/123/session-secret');
    expect(url).toHaveAttribute('type', 'password');
    await waitFor(() => expect(localStorage.getItem('mezonhook:project:v3') ?? '').not.toContain('session-secret'));
  });

  it('routes an imported version 2 project to Bot SDK storage without dropping rich content', async () => {
    const user = userEvent.setup();
    render(<App />);
    const legacy = {
      version: 2,
      name: 'Legacy',
      messages: [{ body: 'Legacy body', card: { color: '#5865F2', title: 'Unsupported card', description: 'x', author: '', thumbnail: '', image: '', fields: [] }, buttons: [{ id: 'x', label: 'Unsupported button', style: 1 }] }],
      targets: [{ id: 'target-1', name: 'Imported channel' }],
    };
    await user.upload(screen.getByLabelText('Import project'), new File([JSON.stringify(legacy)], 'project.json', { type: 'application/json' }));
    await waitFor(() => expect(localStorage.getItem('mezonhook:bot-project:v2')).toContain('Unsupported card'));
    expect(localStorage.getItem('mezonhook:bot-project:v2')).toContain('Unsupported button');
    expect(localStorage.getItem('mezonhook:composer-mode')).toBe('bot');
  });

  it('keeps secondary protocol tooling in progressive disclosure', () => {
    render(<App />);
    expect(screen.getByText('Advanced JSON and code').closest('details')).not.toHaveAttribute('open');
    const editor = screen.getByRole('group', { name: 'Message 1 fields' });
    for (const name of ['Formatting', 'Mentions', 'Images', 'Channel references']) {
      expect(within(editor).getByText(name).closest('details')).not.toHaveAttribute('open');
    }
    expect(screen.getByRole('heading', { name: 'Compose webhook messages' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Delivery' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Send 1 message/ })).toHaveLength(1);
  });

  it('edits all five documented webhook field groups', async () => {
    const user = userEvent.setup();
    render(<App />);
    const editor = screen.getByRole('group', { name: 'Message 1 fields' });
    for (const name of ['Formatting', 'Mentions', 'Images', 'Channel references']) await user.click(within(editor).getByText(name));
    for (const name of ['Add formatting', 'Add mention', 'Add image', 'Add channel reference']) await user.click(within(editor).getByRole('button', { name }));
    expect(within(editor).getByLabelText('Formatting type 1')).toBeInTheDocument();
    expect(within(editor).getByLabelText('Mention identity 1')).toBeInTheDocument();
    expect(within(editor).getByLabelText('Image URL 1')).toBeInTheDocument();
    expect(within(editor).getByLabelText('Channel ID 1')).toBeInTheDocument();
  });

  it('uses the last selected message text for new rich ranges', async () => {
    localStorage.setItem('mezonhook:project:v3', JSON.stringify({
      version: 3,
      name: 'Selection test',
      messages: [{ t: 'Select these words now', mk: [], mentions: [], images: [], hg: [] }],
      targets: [{ id: 'target-1', name: 'Production alerts' }],
    }));
    const user = userEvent.setup();
    render(<App />);
    const editor = screen.getByRole('group', { name: 'Message 1 fields' });
    const textarea = within(editor).getByLabelText('Message text') as HTMLTextAreaElement;
    textarea.focus();
    textarea.setSelectionRange(7, 18);
    fireEvent.select(textarea);
    for (const name of ['Formatting', 'Mentions', 'Channel references']) await user.click(within(editor).getByText(name));
    for (const name of ['Add formatting', 'Add mention', 'Add channel reference']) await user.click(within(editor).getByRole('button', { name }));
    expect(within(editor).getByLabelText('Formatting start 1')).toHaveValue(7);
    expect(within(editor).getByLabelText('Formatting end 1')).toHaveValue(18);
    expect(within(editor).getByLabelText('Mention start 1')).toHaveValue(7);
    expect(within(editor).getByLabelText('Mention end 1')).toHaveValue(18);
    expect(within(editor).getByLabelText('Channel start 1')).toHaveValue(7);
    expect(within(editor).getByLabelText('Channel end 1')).toHaveValue(18);
  });

  it('falls back to 0–1 and explains text selection when no range is selected', async () => {
    localStorage.setItem('mezonhook:project:v3', JSON.stringify({
      version: 3,
      name: 'Fallback test',
      messages: [{ t: 'No selection', mk: [], mentions: [], images: [], hg: [] }],
      targets: [{ id: 'target-1', name: 'Production alerts' }],
    }));
    const user = userEvent.setup();
    render(<App />);
    const editor = screen.getByRole('group', { name: 'Message 1 fields' });
    await user.click(within(editor).getByText('Formatting'));
    await user.click(within(editor).getByRole('button', { name: 'Add formatting' }));
    expect(within(editor).getByLabelText('Formatting start 1')).toHaveValue(0);
    expect(within(editor).getByLabelText('Formatting end 1')).toHaveValue(1);
    expect(within(editor).getByText(/Select text in Message text before choosing Add/)).toBeInTheDocument();
  });
});
