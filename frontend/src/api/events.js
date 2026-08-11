import { apiGet, apiPost } from './client'

export function searchEvents(filters = {}) {
  return apiGet('/events', filters)
}

export function getEvent(id) {
  return apiGet(`/events/${id}`)
}

export function reserveGeneral(eventId, quantity, token) {
  return apiPost(`/events/${eventId}/reservations`, { quantity }, { token })
}
