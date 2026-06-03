import type { SessionsResponse, PreviewResponse, SearchResponse } from '../../shared/types';

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function fetchSessions(): Promise<SessionsResponse> {
  return fetch('/api/sessions').then(json<SessionsResponse>);
}

export function refreshSessions(): Promise<SessionsResponse> {
  return fetch('/api/refresh', { method: 'POST' }).then(json<SessionsResponse>);
}

export function fetchPreview(id: string): Promise<PreviewResponse> {
  return fetch(`/api/sessions/${id}/preview`).then(json<PreviewResponse>);
}

export function searchContent(q: string): Promise<SearchResponse> {
  return fetch(`/api/search?q=${encodeURIComponent(q)}`).then(json<SearchResponse>);
}
