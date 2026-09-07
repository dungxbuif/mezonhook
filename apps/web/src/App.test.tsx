import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from './App';

function readBlobText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('The exported template could not be read.'));
    });
    reader.addEventListener('error', () => reject(new Error('The exported template could not be read.')));
    reader.readAsText(blob);
  });
}

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('MezonHook editor', () => {
  // Mutation caught: template selection no longer replaces the preview draft.
  it('updates the preview when a template is selected', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Release note' }));

    expect(screen.getByTestId('message-preview')).toHaveTextContent('Release note');
  });

  // Mutation caught: changes to the card title no longer propagate to the preview.
  it('updates the preview when the card title is edited', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.clear(screen.getByLabelText('Card title'));
    await user.type(screen.getByLabelText('Card title'), 'Roadmap');

    expect(screen.getByTestId('message-preview')).toHaveTextContent('Roadmap');
  });

  // Mutation caught: adding a field no longer adds an editable field row.
  it('adds an editable field row', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Add field' }));

    expect(screen.getAllByLabelText('Field name')).toHaveLength(1);
  });

  // Mutation caught: valid edits are not restored from browser-local draft storage.
  it('restores a valid draft from local storage after unmount and remount', async () => {
    const user = userEvent.setup();
    const firstRender = render(<App />);

    await user.clear(screen.getByLabelText('Card title'));
    await user.type(screen.getByLabelText('Card title'), 'Persistent title');
    firstRender.unmount();

    render(<App />);

    expect(screen.getByLabelText('Card title')).toHaveValue('Persistent title');
    expect(screen.getByTestId('message-preview')).toHaveTextContent('Persistent title');
  });

  // Mutation caught: malformed imports replace the current preview draft.
  it('shows an alert and keeps the preview when an import is invalid JSON', async () => {
    const user = userEvent.setup();
    render(<App />);
    const templateInput = screen.getByLabelText('Import template');
    const invalidFile = new File(['{not valid JSON'], 'invalid.json', { type: 'application/json' });

    await user.upload(templateInput, invalidFile);

    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to import');
    expect(screen.getByTestId('message-preview')).toHaveTextContent('Announcement');
  });

  // Mutation caught: webhook tokens are visible in the page while users enter them.
  it('keeps the Channel webhook URL field password-masked', () => {
    render(<App />);

    expect(screen.getByLabelText('Channel webhook URL')).toHaveAttribute('type', 'password');
  });

  // Mutation caught: successful delivery does not clear the session-only secret.
  it('clears the webhook URL after a successful send', async () => {
    const user = userEvent.setup();
    const fetcher = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 204 }));
    render(<App />);

    await user.type(screen.getByLabelText('Channel webhook URL'), 'https://webhook.mezon.ai/webhooks/123/token');
    await user.click(screen.getByRole('button', { name: 'Send message' }));

    expect(await screen.findByText('Message sent to Mezon.')).toBeInTheDocument();
    expect(screen.getByLabelText('Channel webhook URL')).toHaveValue('');
    expect(fetcher).toHaveBeenCalledOnce();
  });

  // Mutation caught: imported secret-like fields enter storage, downloaded templates, or the browser POST body.
  it('strips imported webhookUrl properties before storing, exporting, and sending', async () => {
    const user = userEvent.setup();
    const maliciousTemplate = {
      body: 'A sanitized body',
      card: {
        color: '#5865F2',
        title: 'Sanitized title',
        description: 'A sanitized description.',
        author: '',
        thumbnail: '',
        image: '',
        fields: [],
        webhookUrl: 'card-secret',
      },
      buttons: [{ id: 'learn-more', label: 'Learn more', style: 1 }],
      webhookUrl: 'root-secret',
    };
    const fetcher = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 204 }));
    render(<App />);

    await user.upload(
      screen.getByLabelText('Import template'),
      new File([JSON.stringify(maliciousTemplate)], 'malicious-template.json', { type: 'application/json' }),
    );
    await screen.findByDisplayValue('Sanitized title');

    const stored = JSON.parse(localStorage.getItem('mezonhook:draft:v1') ?? '{}');
    expect(stored).not.toHaveProperty('webhookUrl');
    expect(stored.card).not.toHaveProperty('webhookUrl');

    let exportedBlob: Blob | undefined;
    class TestUrl extends URL {
      static createObjectURL(blob: Blob) {
        exportedBlob = blob;
        return 'blob:template';
      }

      static revokeObjectURL() {}
    }
    vi.stubGlobal('URL', TestUrl);
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    await user.click(screen.getByRole('button', { name: 'Export template' }));
    await waitFor(() => expect(exportedBlob).toBeDefined());
    const exported = JSON.parse(await readBlobText(exportedBlob!));
    expect(exported).not.toHaveProperty('webhookUrl');
    expect(exported.card).not.toHaveProperty('webhookUrl');

    await user.type(screen.getByLabelText('Channel webhook URL'), 'https://webhook.mezon.ai/webhooks/123/token');
    await user.click(screen.getByRole('button', { name: 'Send message' }));
    const [, request] = fetcher.mock.calls[0] as [string, RequestInit];
    const payload = JSON.parse(request.body as string);
    expect(payload).toMatchObject({ type: 'hook' });
    expect(payload).not.toHaveProperty('webhookUrl');
    expect(payload.message.embed[0]).not.toHaveProperty('webhookUrl');
  });
});
