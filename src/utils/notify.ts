import { toast, type ToastOptions } from 'react-toastify';

/** Message shown when no context is given and the error carries no reason. */
const GENERIC_ERROR = 'The action could not be completed.';

/** Capitalises the first letter and ends the text with a full stop. */
function asSentence(text: string): string {
  const t = text.trim().replace(/[:\s]+$/, '');
  if (!t) return t;
  const capped = t.charAt(0).toUpperCase() + t.slice(1);
  return /[.?…]$/.test(capped) ? capped : `${capped}.`;
}

/** The reason carried by a thrown error (usually the server's message). */
function reasonOf(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  if (err && typeof err === 'object' && 'message' in err && typeof (err as { message: unknown }).message === 'string') {
    return (err as { message: string }).message;
  }
  return '';
}

/**
 * Formal error text: what failed, then why.
 *   errorText(err, 'Could not save the remark.') -> "Could not save the remark. Remark not found."
 */
export function errorText(err: unknown, context?: string): string {
  const reason = reasonOf(err).trim();
  if (!context) return asSentence(reason || GENERIC_ERROR);
  const what = asSentence(context);
  if (!reason) return what;
  const why = asSentence(reason);
  // Skip the reason when it only repeats the context.
  return why.toLowerCase() === what.toLowerCase() ? what : `${what} ${why}`;
}

/** Shows a formal error pop-up for a failed action. */
export function notifyError(err: unknown, context?: string, options?: ToastOptions) {
  return toast.error(errorText(err, context), options);
}
