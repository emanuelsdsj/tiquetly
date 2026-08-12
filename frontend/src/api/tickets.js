import { apiGet } from './client'

export function getMyTickets(token) {
  return apiGet('/tickets/mine', {}, { token })
}

export function getPublicTicket(publicCode) {
  return apiGet(`/tickets/public/${publicCode}`)
}
