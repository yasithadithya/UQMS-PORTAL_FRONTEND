/**
 * Deliverable control on the client: unsigned deliverables are preview only (the server
 * watermarks them and refuses downloads); once signed they can be downloaded.
 */

export const PREVIEW_ONLY_HINT = 'Download is available after the responsible surveyor signs it.';

/** Saves a PDF blob under `filename`. */
export const saveBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Opens a tab right away (inside the click, so popup blockers allow it) and shows the PDF in it
 * once loaded. Closes the tab again if loading fails.
 */
export const previewPdfInNewTab = async (load: () => Promise<Blob>): Promise<void> => {
  const win = window.open('', '_blank');
  try {
    const url = URL.createObjectURL(await load());
    if (win) win.location.href = url;
    else window.open(url, '_blank');
    // Keep the URL alive long enough for the viewer to load it.
    window.setTimeout(() => URL.revokeObjectURL(url), 5 * 60_000);
  } catch (err) {
    win?.close();
    throw err;
  }
};
