import { apiGet, apiPost, apiPostForm } from './client'

export function login(email, password) {
  return apiPostForm('/auth/login', { username: email, password })
}

export function register(name, email, password) {
  return apiPost('/auth/register', { name, email, password })
}

export function fetchCurrentUser(token) {
  return apiGet('/auth/me', {}, { token })
}
