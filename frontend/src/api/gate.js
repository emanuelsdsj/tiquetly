import { apiPost } from './client'

export function validateTicket(payload, token) {
  return apiPost('/tickets/validate', payload, { token })
}
