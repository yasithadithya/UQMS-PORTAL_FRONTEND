const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// Generous because the backend host cold-starts and PDF generation is slow.
const REQUEST_TIMEOUT_MS = 90_000;

/** Fired on window when an authenticated request comes back 401. AuthContext logs the user out. */
export const AUTH_EXPIRED_EVENT = 'uqms:auth-expired';

export function getToken(): string | null {
  return localStorage.getItem('token');
}

async function readJson(res: Response): Promise<any> {
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) return null;
  try {
    return await res.json();
  } catch {
    return null;
  }
}

async function send(endpoint: string, init: RequestInit, headers: Record<string, string>): Promise<Response> {
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const controller = init.signal ? null : new AbortController();
  const timer = controller ? setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS) : undefined;

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${endpoint}`, {
      ...init,
      headers,
      signal: init.signal ?? controller!.signal,
    });
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw new Error(init.signal ? 'Request was cancelled.' : 'The server took too long to respond. Please try again.');
    }
    throw new Error("Can't reach the server. Check your connection and try again.");
  } finally {
    clearTimeout(timer);
  }

  if (res.status === 401 && token) {
    window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
  }

  return res;
}

async function handleJson<T>(res: Response): Promise<T> {
  const data = await readJson(res);

  if (!res.ok) {
    throw new Error(data?.message || `Request failed (${res.status}${res.statusText ? ` ${res.statusText}` : ''})`);
  }

  return data as T;
}

export async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await send(endpoint, options, {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  });
  return handleJson<T>(res);
}

export async function requestFormData<T>(
  endpoint: string,
  formData: FormData,
  options: RequestInit = {}
): Promise<T> {
  const res = await send(endpoint, { ...options, body: formData }, {
    ...(options.headers as Record<string, string>),
  });
  return handleJson<T>(res);
}

export async function requestBlob(
  endpoint: string,
  options: RequestInit = {}
): Promise<Blob> {
  const res = await send(endpoint, options, {
    ...(options.headers as Record<string, string>),
  });

  if (!res.ok) {
    const data = await readJson(res);
    throw new Error(data?.message || 'Something went wrong while fetching the PDF.');
  }

  return res.blob();
}
