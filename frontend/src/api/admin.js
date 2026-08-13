import { apiGet, apiPost } from './client'

export function listStaffAccounts(token) {
  return apiGet('/admin/users', {}, { token })
}

export function createStaffAccount(data, token) {
  return apiPost('/admin/users', data, { token })
}
