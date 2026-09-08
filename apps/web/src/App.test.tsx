import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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
  // Mutation caught: the builder falls back to a long ungrouped form instead of collapsible composer sections.
  it('uses collapsible composer cards for the selected message', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByRole('button', { name: 'Content' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Embeds' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Fields' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Components' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Advanced' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Card title')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Embeds' }));

    expect(screen.getByLabelText('Card title')).toBeInTheDocument();
  });

  // Mutation caught: visual accordion sections drift into bespoke, nested heading controls.
  it('uses one compact semantic header primitive for every composer section', async () => {
    const user = userEvent.setup();
    render(<App />);
    const labels = ['Content', 'Embeds', 'Fields', 'Components', 'Advanced'];

    for (const label of labels) expect(screen.getByRole('button', { name: label })).toHaveClass('accordion-header');

    await user.click(screen.getByRole('button', { name: 'Fields' }));
    await user.click(screen.getByRole('button', { name: 'Components' }));
    expect(document.querySelector('#message-0-fields h2')).toBeNull();
    expect(document.querySelector('#message-0-components h2')).toBeNull();
  });

  // Mutation caught: documented Mezon interactive fields can no longer be added, edited, or previewed.
  it('adds and previews a documented Select interactive field', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Fields' }));
    await user.click(screen.getByRole('button', { name: 'Add Select' }));

    expect(screen.getByLabelText('Interactive ID')).toHaveValue('select-1');
    expect(screen.getByTestId('interactive-preview-2')).toHaveTextContent('New option');
    await user.click(screen.getByRole('button', { name: 'Remove interactive block 1' }));
    expect(screen.queryByTestId('interactive-preview-2')).not.toBeInTheDocument();
  });

  // Mutation caught: the builder loses its independently addressable two-pane project workspace.
  it('exposes the sequential project editor and preview as one builder workspace', () => {
    render(<App />);

    expect(screen.getByTestId('project-editor')).toHaveAttribute('data-builder-layout', 'two-pane-sequence');
  });

  // Mutation caught: delivery and help return to separate topbar screens instead of staying in the builder flow.
  it('keeps delivery targets and help inline below the message editor', () => {
    render(<App />);

    const delivery = screen.getByRole('heading', { name: 'Delivery targets' });
    expect(delivery.closest('.editor-pane')).not.toBeNull();
    expect(screen.getByLabelText('Webhook URL for Mezon channel')).toHaveAttribute('type', 'password');
    expect(screen.getByText('Help and webhook guidance')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Config' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Help' })).not.toBeInTheDocument();
  });

  // Mutation caught: adding a project message does not add it to the ordered preview sequence.
  it('adds a message and renders both messages in sequence preview', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Add Message' }));
    expect(screen.getAllByTestId('message-preview')).toHaveLength(2);
  });

  // Mutation caught: template actions remain in the builder or a new message is pre-filled as a template.
  it('adds a blank message without exposing template actions', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.queryByRole('button', { name: 'Release note' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Add Message' }));

    expect(within(screen.getAllByTestId(/message-editor-/)[1]).getByLabelText('Body')).toHaveValue('');
  });

  // Mutation caught: sequential editor headers do not update the shared project delivery order after a native drag-and-drop.
  it('reorders project messages by dragging a sequential editor header', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Add Message' }));
    const editors = screen.getAllByTestId(/message-editor-/);
    await user.click(within(editors[1]).getByRole('button', { name: 'Embeds' }));
    await user.clear(within(editors[1]).getByLabelText('Card title'));
    await user.type(within(editors[1]).getByLabelText('Card title'), 'Second message first');
    const headers = screen.getAllByTestId(/message-editor-/).map((editor) => editor.querySelector('header')!);
    const dataTransfer = { effectAllowed: 'move', dropEffect: 'move', setData: vi.fn(), getData: vi.fn(() => '1') };

    fireEvent.dragStart(headers[1], { dataTransfer });
    fireEvent.dragOver(headers[0], { dataTransfer });
    fireEvent.drop(headers[0], { dataTransfer });

    expect(screen.getAllByTestId(/message-editor-/)[0]).toHaveTextContent('Second message first');
    expect(screen.getAllByTestId('message-preview')[0]).toHaveTextContent('Second message first');
  });

  // Mutation caught: channel target URLs become visible or move into persisted project state.
  it('keeps target URLs masked and session-only in Config', async () => {
    const user = userEvent.setup();
    render(<App />);
    const urlInput = screen.getByLabelText('Webhook URL for Mezon channel');
    await user.type(urlInput, 'https://webhook.mezon.ai/webhooks/123/session-secret');
    expect(urlInput).toHaveAttribute('type', 'password');
    expect(localStorage.getItem('mezonhook:project:v2')).not.toContain('session-secret');
  });

  // Mutation caught: the in-product setup path loses the official Mezon documentation link.
  it('shows in-app help with official Mezon documentation', async () => {
    render(<App />);
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
    await user.type(screen.getByLabelText('Webhook URL for Mezon channel'), 'https://webhook.mezon.ai/webhooks/123/session-secret');
    await user.click(screen.getByRole('button', { name: 'Send project' }));
    expect(await screen.findByText('Sent 1 message to 1 target.')).toBeInTheDocument();
    expect(fetcher).toHaveBeenCalledOnce();
    expect(screen.getByLabelText('Webhook URL for Mezon channel')).toHaveValue('');
  });
});
