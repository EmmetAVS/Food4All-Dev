async function apiFetch(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || 'Request failed')
  return data
}

export const api = {
  login: (username, password) =>
    apiFetch('/api/login', { method: 'POST', body: JSON.stringify({ username, password }) }),

  signup: (username, password, email, branch) =>
    apiFetch('/api/signup', { method: 'POST', body: JSON.stringify({ username, password, email, branch }) }),

  me: () => apiFetch('/api/me'),

  branches: () => apiFetch('/api/branches'),

  collections: () => apiFetch('/api/collections'),

  createCollection: (data) =>
    apiFetch('/api/collections/create', { method: 'POST', body: JSON.stringify(data) }),

  updateCollection: (id, data) =>
    apiFetch(`/api/collections/${id}/update`, { method: 'POST', body: JSON.stringify(data) }),

  deleteCollection: (id) =>
    apiFetch(`/api/collections/${id}/delete`, { method: 'POST' }),

  generateCharts: (data) =>
    apiFetch('/api/generate_charts', { method: 'POST', body: JSON.stringify(data) }),

  createBranch: (name, acronym) =>
    apiFetch('/api/branches/create', { method: 'POST', body: JSON.stringify({ name, acronym }) }),

  upgradeUser: (username) =>
    apiFetch(`/api/users/${username}/upgrade`),

  exec: (code) =>
    apiFetch(`/api/exec/${encodeURIComponent(code)}`),
}

export function setTokenCookie(token) {
  const expires = new Date()
  expires.setDate(expires.getDate() + 7)
  document.cookie = `token=${token}; path=/; expires=${expires.toUTCString()}`
}
