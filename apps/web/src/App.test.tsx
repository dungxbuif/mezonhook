import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import App from './App';

afterEach(cleanup);

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
});
