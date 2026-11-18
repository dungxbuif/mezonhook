const COPY_ERROR = 'Clipboard access was blocked. Select the code and copy it manually.';

function restoreUi(activeElement: Element | null, ranges: Range[]) {
  if (activeElement instanceof HTMLElement) activeElement.focus();
  const selection = window.getSelection();
  if (selection) {
    selection.removeAllRanges();
    for (const range of ranges) selection.addRange(range);
  }
}

function fallbackCopy(text: string): boolean {
  const activeElement = document.activeElement;
  const selection = window.getSelection();
  const ranges = selection ? Array.from({ length: selection.rangeCount }, (_, index) => selection.getRangeAt(index).cloneRange()) : [];
  const textarea = document.createElement('textarea');
  textarea.dataset.copyFallback = 'true';
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  textarea.style.pointerEvents = 'none';
  document.body.append(textarea);
  textarea.focus();
  textarea.select();
  try { return document.execCommand?.('copy') === true; }
  catch { return false; }
  finally {
    textarea.remove();
    restoreUi(activeElement, ranges);
  }
}

export async function copyText(text: string): Promise<void> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
  } catch { /* fall through to the browser-compatible path */ }
  if (fallbackCopy(text)) return;
  throw new Error(COPY_ERROR);
}
