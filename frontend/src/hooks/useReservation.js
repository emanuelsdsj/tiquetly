import { useState } from 'react'
import { getEvent, getEventSeats, reserveGeneral, reserveSeats } from '../api/events'
import { cancelReservation } from '../api/reservations'
import { translateApiError } from '../lib/apiErrors'

export function useReservation({ id, token, t, event, setEvent, seats, setSeats }) {
  const [quantity, setQuantity] = useState(1)
  const [selectedSeatIds, setSelectedSeatIds] = useState([])
  const [reservation, setReservation] = useState(null)
  const [reserveError, setReserveError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [declinedMessage, setDeclinedMessage] = useState(null)
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState(null)

  function toggleSeat(seatId) {
    setSelectedSeatIds((current) =>
      current.includes(seatId) ? current.filter((id) => id !== seatId) : [...current, seatId],
    )
  }

  function handleDeclined() {
    setDeclinedMessage(t('eventDetail.declinedPayment'))
    setReservation(null)
    setSelectedSeatIds([])
    getEvent(id).then(setEvent)
    if (event?.reservation_mode === 'seatmap') getEventSeats(id).then(setSeats)
  }

  function handleExpired() {
    setDeclinedMessage(t('eventDetail.reservationExpired'))
    setReservation(null)
    setSelectedSeatIds([])
    getEvent(id).then(setEvent)
    if (event?.reservation_mode === 'seatmap') getEventSeats(id).then(setSeats)
  }

  async function handleCancelReservation() {
    setCancelling(true)
    setCancelError(null)
    try {
      await cancelReservation(reservation.id, token)
      setDeclinedMessage(t('eventDetail.declinedCancel'))
      setReservation(null)
      setSelectedSeatIds([])
      getEvent(id).then(setEvent)
      if (event?.reservation_mode === 'seatmap') getEventSeats(id).then(setSeats)
    } catch (err) {
      setCancelError(translateApiError(err, t))
    } finally {
      setCancelling(false)
    }
  }

  async function handleReserveGeneral(formEvent) {
    formEvent.preventDefault()
    setSubmitting(true)
    setReserveError(null)
    setDeclinedMessage(null)
    try {
      const created = await reserveGeneral(id, quantity, token)
      setReservation(created)
      // Keeps event.reserved_count (and therefore `remaining`) accurate
      // the moment a reservation is made, same as handleDeclined/
      // handleExpired/handleCancelReservation already do on their own
      // paths, instead of only refreshing on the next full page load.
      getEvent(id).then(setEvent)
    } catch (err) {
      setReserveError(translateApiError(err, t))
      // A SoldOutError here means capacity changed since the page
      // loaded; refresh it so the form's remaining count/max stepper
      // bound reflect reality instead of the stale value that caused
      // the failed attempt in the first place.
      getEvent(id).then(setEvent)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleReserveSeats() {
    setSubmitting(true)
    setReserveError(null)
    setDeclinedMessage(null)
    try {
      const created = await reserveSeats(id, selectedSeatIds, token)
      setReservation(created)
      const seatsById = new Map(seats.map((seat) => [seat.id, seat]))
      setSeats(
        seats.map((seat) =>
          selectedSeatIds.includes(seat.id) ? { ...seat, status: 'reserved' } : seat,
        ),
      )
      setSelectedSeatIds((current) => current.filter((seatId) => seatsById.has(seatId)))
      getEvent(id).then(setEvent)
    } catch (err) {
      setReserveError(translateApiError(err, t))
      // One or more selected seats may have just been taken by someone
      // else; refresh both so the map reflects which seats are actually
      // still available.
      getEvent(id).then(setEvent)
      getEventSeats(id).then(setSeats)
    } finally {
      setSubmitting(false)
    }
  }

  return {
    quantity,
    setQuantity,
    selectedSeatIds,
    toggleSeat,
    reservation,
    setReservation,
    reserveError,
    submitting,
    declinedMessage,
    cancelling,
    cancelError,
    handleDeclined,
    handleExpired,
    handleCancelReservation,
    handleReserveGeneral,
    handleReserveSeats,
  }
}
