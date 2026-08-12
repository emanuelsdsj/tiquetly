import { apiPost } from './client'

export function payReservation(reservationId, card, token) {
  return apiPost(`/reservations/${reservationId}/pay`, card, { token })
}
