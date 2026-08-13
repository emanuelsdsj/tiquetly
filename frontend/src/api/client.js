const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export class ApiError extends Error {
  constructor(message, status, code, params) {
    super(message)
    this.status = status
    this.code = code
    this.params = params
  }
}

async function parseErrorAndThrow(response) {
  const body = await response.json().catch(() => ({}))
  throw new ApiError(
    body.detail || 'Could not complete the request.',
    response.status,
    body.code,
    body.params,
  )
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
