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

export function getEventSeats(eventId) {
  return apiGet(`/events/${eventId}/seats`)
}

export function reserveSeats(eventId, seatIds, token) {
  return apiPost(`/events/${eventId}/seat-reservations`, { seat_ids: seatIds }, { token })
}
