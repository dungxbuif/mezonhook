import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from './App';

function readBlobText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Could not read export.')));
    reader.addEventListener('error', () => reject(new Error('Could not read export.')));
    reader.readAsText(blob);
  });
}

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('MezonHook project builder', () => {
  // Mutation caught: adding a project message does not add it to the ordered preview sequence.
  it('adds a message and renders both messages in sequence preview', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Add message' }));
    expect(screen.getAllByTestId('message-preview')).toHaveLength(2);
  });

  // Mutation caught: channel target URLs become visible or move into persisted project state.
  it('keeps target URLs masked and session-only in Config', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Config' }));
    const urlInput = screen.getByLabelText('Webhook URL for Mezon channel');
    await user.type(urlInput, 'https://webhook.mezon.ai/webhooks/123/session-secret');
    expect(urlInput).toHaveAttribute('type', 'password');
    expect(localStorage.getItem('mezonhook:project:v2')).not.toContain('session-secret');
  });

  // Mutation caught: the in-product setup path loses the official Mezon documentation link.
  it('shows in-app help with official Mezon documentation', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Help' }));
    expect(screen.getByRole('link', { name: 'Open Mezon documentation' })).toHaveAttribute('href', 'https://mezon.ai/docs/vi/');
  });

  // Mutation caught: project import does not replace the editable project with validated project JSON.
  it('imports a project and renders its message sequence', async () => {
    const user = userEvent.setup();
    render(<App />);
    const project = {
      version: 2,
      name: 'Imported project',
      messages: [
        { body: 'First import', card: { color: '#5865F2', title: 'First', description: 'First imported card.', author: '', thumbnail: '', image: '', fields: [] }, buttons: [] },
        { body: 'Second import', card: { color: '#5865F2', title: 'Second', description: 'Second imported card.', author: '', thumbnail: '', image: '', fields: [] }, buttons: [] },
      ],
      targets: [{ id: 'target-1', name: 'Imported channel' }],
    };
    await user.upload(screen.getByLabelText('Import project'), new File([JSON.stringify(project)], 'project.json', { type: 'application/json' }));
    expect(await screen.findByDisplayValue('Imported project')).toBeInTheDocument();
    expect(screen.getAllByTestId('message-preview')).toHaveLength(2);
  });

  // Mutation caught: export includes a session-only target secret instead of strict project data.
  it('exports project JSON without a configured target URL', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Config' }));
    await user.type(screen.getByLabelText('Webhook URL for Mezon channel'), 'https://webhook.mezon.ai/webhooks/123/session-secret');
    let exportedBlob: Blob | undefined;
    class TestUrl extends URL {
      static createObjectURL(blob: Blob) { exportedBlob = blob; return 'blob:project'; }
      static revokeObjectURL() {}
    }
    vi.stubGlobal('URL', TestUrl);
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    await user.click(screen.getByRole('button', { name: 'Export project' }));
    await waitFor(() => expect(exportedBlob).toBeDefined());
    expect(await readBlobText(exportedBlob!)).not.toContain('session-secret');
  });

  // Mutation caught: batch delivery does not use the selected session target or expose its delivery result.
  it('sends the project sequence to selected configured targets', async () => {
    const user = userEvent.setup();
    const fetcher = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 204 }));
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Config' }));
    await user.type(screen.getByLabelText('Webhook URL for Mezon channel'), 'https://webhook.mezon.ai/webhooks/123/session-secret');
    await user.click(screen.getByRole('button', { name: 'Send project' }));
    expect(await screen.findByText('Sent 1 message to 1 target.')).toBeInTheDocument();
    expect(fetcher).toHaveBeenCalledOnce();
    expect(screen.getByLabelText('Webhook URL for Mezon channel')).toHaveValue('');
  });
});
