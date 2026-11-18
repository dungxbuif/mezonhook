import { afterEach, describe, expect, it, vi } from 'vitest';
import { copyText } from './clipboard';

const setClipboard = (value: { writeText: (text: string) => Promise<void> } | undefined) => {
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value });
};

const setExecCommand = (value: ((command: string) => boolean) | undefined) => {
  Object.defineProperty(document, 'execCommand', { configurable: true, value });
};

afterEach(() => {
  setClipboard(undefined);
  setExecCommand(undefined);
  document.body.replaceChildren();
  window.getSelection()?.removeAllRanges();
  vi.restoreAllMocks();
});

describe('copyText', () => {
  it('uses native clipboard and resolves only after writeText succeeds', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const fallback = vi.fn(() => true);
    setClipboard({ writeText });
    setExecCommand(fallback);

    await copyText('native value');

    expect(writeText).toHaveBeenCalledWith('native value');
    expect(fallback).not.toHaveBeenCalled();
  });

  it('falls back when native clipboard rejects', async () => {
    setClipboard({ writeText: vi.fn().mockRejectedValue(new Error('denied')) });
    const fallback = vi.fn(() => true);
    setExecCommand(fallback);

    await copyText('fallback value');

    expect(fallback).toHaveBeenCalledWith('copy');
  });

  it('uses the fallback when native clipboard is missing', async () => {
    setClipboard(undefined);
    const fallback = vi.fn(() => true);
    setExecCommand(fallback);

    await copyText('legacy browser');

    expect(fallback).toHaveBeenCalledWith('copy');
  });

  it('rejects with manual guidance and restores focus and selection when every mechanism fails', async () => {
    const input = document.createElement('input');
    input.value = 'keep focus';
    const selected = document.createElement('span');
    selected.textContent = 'keep selection';
    document.body.append(input, selected);
    input.focus();
    const range = document.createRange();
    range.selectNodeContents(selected);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    setClipboard({ writeText: vi.fn().mockRejectedValue(new Error('denied')) });
    setExecCommand(() => false);

    await expect(copyText('blocked')).rejects.toThrow('Select the code and copy it manually');

    expect(document.activeElement).toBe(input);
    expect(window.getSelection()?.toString()).toBe('keep selection');
    expect(document.querySelector('[data-copy-fallback]')).toBeNull();
  });
});
