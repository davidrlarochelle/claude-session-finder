async function json(res) {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export function fetchSessions() {
  return fetch('/api/sessions').then(json);
}

export function refreshSessions() {
  return fetch('/api/refresh', { method: 'POST' }).then(json);
}

export function fetchPreview(id) {
  return fetch(`/api/sessions/${id}/preview`).then(json);
}
