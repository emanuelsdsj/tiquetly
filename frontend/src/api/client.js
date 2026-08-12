const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

async function parseErrorAndThrow(response) {
  const body = await response.json().catch(() => ({}))
  throw new ApiError(body.detail || 'Não foi possível completar a requisição.', response.status)
}

export async function apiGet(path, params = {}, { token } = {}) {
  const url = new URL(path, API_URL)
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, value)
    }
  }

  const headers = token ? { Authorization: `Bearer ${token}` } : undefined
  const response = await fetch(url, { headers })
  if (!response.ok) await parseErrorAndThrow(response)
  return response.json()
}

export async function apiPost(path, body, { token } = {}) {
  const url = new URL(path, API_URL)
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`

  const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) })
  if (!response.ok) await parseErrorAndThrow(response)
  return response.json()
}

export async function apiPatch(path, body, { token } = {}) {
  const url = new URL(path, API_URL)
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`

  const response = await fetch(url, { method: 'PATCH', headers, body: JSON.stringify(body) })
  if (!response.ok) await parseErrorAndThrow(response)
  return response.json()
}

export async function apiPostForm(path, fields) {
  const url = new URL(path, API_URL)
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(fields),
  })
  if (!response.ok) await parseErrorAndThrow(response)
  return response.json()
}
