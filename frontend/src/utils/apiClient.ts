// Basic API client placeholder.
// Later this will handle auth headers, base URL configuration,
// and typed responses shared with the backend via the shared/types folder.

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api';

export async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`);
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: `Request failed with status ${res.status}` }));
    throw new Error(error.error || `Request failed with status ${res.status}`);
  }
  return (await res.json()) as T;
}

export async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: `Request failed with status ${res.status}` }));
    throw new Error(error.error || `Request failed with status ${res.status}`);
  }
  return (await res.json()) as T;
}


