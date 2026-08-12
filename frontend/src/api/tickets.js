import { apiGet } from './client'

export function getMyTickets(token) {
  return apiGet('/tickets/mine', {}, { token })
}
