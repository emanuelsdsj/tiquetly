import { apiGet, apiPatch, apiPost } from './client'

export function searchEvents(filters = {}) {
  return apiGet('/events', filters)
}

export function getEvent(id) {
  return apiGet(`/events/${id}`)
}

export function getMyEvents(token) {
  return apiGet('/events/mine', {}, { token })
}

export function createEvent(data, token) {
  return apiPost('/events', data, { token })
}

export function updateEvent(id, data, token) {
  return apiPatch(`/events/${id}`, data, { token })
}

export function unpublishEvent(id, token) {
  return apiPost(`/events/${id}/unpublish`, {}, { token })
}

export function reserveGeneral(eventId, quantity, token) {
  return apiPost(`/events/${eventId}/reservations`, { quantity }, { token })
}

export function getEventSeats(eventId) {
  return apiGet(`/events/${eventId}/seats`)
}

export function reserveSeats(eventId, seatIds, token) {
  return apiPost(`/events/${eventId}/seat-reservations`, { seat_ids: seatIds }, { token })
}
