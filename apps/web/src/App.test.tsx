import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from './App';

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
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

    expect(screen.getByRole('alert')).toHaveTextContent('Unable to import');
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
});
