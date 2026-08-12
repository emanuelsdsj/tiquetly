import { apiPost } from './client'

export function payReservation(reservationId, card, token) {
  return apiPost(`/reservations/${reservationId}/pay`, card, { token })
}

export function cancelReservation(reservationId, token) {
  return apiPost(`/reservations/${reservationId}/cancel`, {}, { token })
}
