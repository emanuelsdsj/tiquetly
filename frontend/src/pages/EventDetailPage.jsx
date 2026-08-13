import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getEvent, getEventSeats, reserveGeneral, reserveSeats } from '../api/events'
import { cancelReservation } from '../api/reservations'
import { PaymentForm } from '../components/PaymentForm'
import { ReservationCountdown } from '../components/ReservationCountdown'
import { SeatMap } from '../components/SeatMap'
import { Spinner } from '../components/Spinner'
import { useAuth } from '../context/AuthContext'
import { useLocale } from '../context/LocaleContext'
import { translateApiError } from '../lib/apiErrors'
import { formatEventDate, formatPrice } from '../lib/format'
import './EventDetailPage.css'

export function EventDetailPage() {
  const { id } = useParams()
  const { token, user } = useAuth()
  const { t, locale } = useLocale()
  const [event, setEvent] = useState(null)
  const [error, setError] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [seats, setSeats] = useState(null)
  const [selectedSeatIds, setSelectedSeatIds] = useState([])
  const [reservation, setReservation] = useState(null)
  const [reserveError, setReserveError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [declinedMessage, setDeclinedMessage] = useState(null)
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState(null)

  useEffect(() => {
    setError(null)
    setEvent(null)
    getEvent(id)
      .then(setEvent)
      .catch((err) => setError(translateApiError(err, t)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => {
    if (event?.reservation_mode !== 'seatmap') return
    getEventSeats(id)
      .then(setSeats)
      .catch((err) => setError(translateApiError(err, t)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, event])

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
    } catch (err) {
      setReserveError(translateApiError(err, t))
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
    } catch (err) {
      setReserveError(translateApiError(err, t))
    } finally {
      setSubmitting(false)
    }
  }

  if (error)
    return <p className="event-detail-page__state event-detail-page__state--error">{error}</p>
  if (!event)
    return (
      <p className="event-detail-page__state">
        <Spinner />
        {t('eventDetail.loading')}
      </p>
    )

  const remaining = event.capacity - event.reserved_count
  const selectedSeatLabels =
    seats && selectedSeatIds.length > 0
      ? selectedSeatIds
          .map((seatId) => seats.find((seat) => seat.id === seatId))
          .filter(Boolean)
          .map((seat) => `${seat.row}${seat.col}`)
          .join(', ')
      : ''
  const seatLabelsPlural = selectedSeatLabels.includes(',')

  return (
    <main className="event-detail-page">
      <div className="event-detail-page__layout">
        <div className="event-detail-page__info">
          {event.image && (
            <img className="event-detail-page__image" src={event.image} alt="" aria-hidden="true" />
          )}
          <span className={`event-detail-page__tag event-detail-page__tag--${event.category}`}>
            {t(`common.category.${event.category}`)}
          </span>
          <h1 className="event-detail-page__title">{event.title}</h1>
          <p className="event-detail-page__venue">
            {event.venue} · {formatEventDate(event.date, locale)}
          </p>
          {event.description && (
            <p className="event-detail-page__description">{event.description}</p>
          )}
          <p className="event-detail-page__price">{formatPrice(event.price, locale)}</p>
        </div>

        <div className="event-detail-page__reserve-column">
          {event.reservation_mode === 'general' && (
            <section className="event-detail-page__reserve">
              {declinedMessage && !reservation && (
                <p className="event-detail-page__declined">{declinedMessage}</p>
              )}
              {reservation ? (
                reservation.status === 'paid' ? (
                  <p className="event-detail-page__confirmation">
                    {t('eventDetail.paidGeneral', { count: reservation.quantity })}
                    <Link to="/my-tickets">{t('eventDetail.myTicketsLinkText')}</Link>.
                  </p>
                ) : (
                  <>
                    <p className="event-detail-page__confirmation">
                      {t('eventDetail.pendingGeneral', { count: reservation.quantity })}
                    </p>
                    <ReservationCountdown
                      createdAt={reservation.created_at}
                      onExpire={handleExpired}
                    />
                    <PaymentForm
                      reservation={reservation}
                      amount={event.price * reservation.quantity}
                      onPaid={setReservation}
                      onDeclined={handleDeclined}
                    />
                    {cancelError && <p className="event-detail-page__error">{cancelError}</p>}
                    <button
                      type="button"
                      className="event-detail-page__cancel"
                      onClick={handleCancelReservation}
                      disabled={cancelling}
                    >
                      {cancelling ? t('eventDetail.cancelling') : t('eventDetail.giveUpAndCancel')}
                    </button>
                  </>
                )
              ) : remaining <= 0 ? (
                <p className="event-detail-page__state">{t('eventDetail.soldOut')}</p>
              ) : !user ? (
                <p className="event-detail-page__state">
                  <Link to="/login">{t('common.signInLinkText')}</Link>{' '}
                  {t('eventDetail.toReserveTicket')}
                </p>
              ) : (
                <form className="event-detail-page__form" onSubmit={handleReserveGeneral}>
                  <div className="event-detail-page__quantity">
                    <span>{t('eventDetail.quantity')}</span>
                    <div className="quantity-stepper">
                      <button
                        type="button"
                        className="quantity-stepper__button"
                        onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                        disabled={quantity <= 1}
                        aria-label={t('eventDetail.decreaseAria')}
                      >
                        −
                      </button>
                      <span className="quantity-stepper__value" aria-live="polite">
                        {quantity}
                      </span>
                      <button
                        type="button"
                        className="quantity-stepper__button"
                        onClick={() => setQuantity((current) => Math.min(remaining, current + 1))}
                        disabled={quantity >= remaining}
                        aria-label={t('eventDetail.increaseAria')}
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <span className="event-detail-page__remaining">
                    {t('eventDetail.available', { count: remaining })}
                  </span>
                  {reserveError && <p className="event-detail-page__error">{reserveError}</p>}
                  <button type="submit" disabled={submitting}>
                    {submitting ? t('eventDetail.reserving') : t('eventDetail.reserve')}
                  </button>
                </form>
              )}
            </section>
          )}

          {event.reservation_mode === 'seatmap' && (
            <section className="event-detail-page__reserve event-detail-page__reserve--seatmap">
              {declinedMessage && !reservation && (
                <p className="event-detail-page__declined">{declinedMessage}</p>
              )}
              {reservation ? (
                reservation.status === 'paid' ? (
                  <p className="event-detail-page__confirmation">
                    {t('eventDetail.paidSeats', {
                      plural: seatLabelsPlural,
                      labels: selectedSeatLabels || t('eventDetail.seatSelected'),
                    })}
                    <Link to="/my-tickets">{t('eventDetail.myTicketsLinkText')}</Link>.
                  </p>
                ) : (
                  <>
                    <p className="event-detail-page__confirmation">
                      {t('eventDetail.pendingSeats', {
                        plural: seatLabelsPlural,
                        labels: selectedSeatLabels || t('eventDetail.seatSelected'),
                      })}
                    </p>
                    <ReservationCountdown
                      createdAt={reservation.created_at}
                      onExpire={handleExpired}
                    />
                    <PaymentForm
                      reservation={reservation}
                      amount={event.price * selectedSeatIds.length}
                      onPaid={setReservation}
                      onDeclined={handleDeclined}
                    />
                    {cancelError && <p className="event-detail-page__error">{cancelError}</p>}
                    <button
                      type="button"
                      className="event-detail-page__cancel"
                      onClick={handleCancelReservation}
                      disabled={cancelling}
                    >
                      {cancelling ? t('eventDetail.cancelling') : t('eventDetail.giveUpAndCancel')}
                    </button>
                  </>
                )
              ) : !seats ? (
                <p className="event-detail-page__state">
                  <Spinner />
                  {t('eventDetail.loadingSeats')}
                </p>
              ) : seats.every((seat) => seat.status !== 'available') ? (
                <p className="event-detail-page__state">{t('eventDetail.allSeatsTaken')}</p>
              ) : (
                <>
                  <SeatMap
                    seats={seats}
                    selected={selectedSeatIds}
                    onToggle={toggleSeat}
                    category={event.category}
                  />
                  {!user ? (
                    <p className="event-detail-page__state">
                      <Link to="/login">{t('common.signInLinkText')}</Link>{' '}
                      {t('eventDetail.toReserveSeats')}
                    </p>
                  ) : (
                    <div className="event-detail-page__seat-summary">
                      <span>
                        {selectedSeatIds.length > 0
                          ? t('eventDetail.seatsSelectedSummary', {
                              count: selectedSeatIds.length,
                              price: formatPrice(event.price * selectedSeatIds.length, locale),
                            })
                          : t('eventDetail.selectSeats')}
                      </span>
                      {reserveError && <p className="event-detail-page__error">{reserveError}</p>}
                      <button
                        type="button"
                        disabled={selectedSeatIds.length === 0 || submitting}
                        onClick={handleReserveSeats}
                      >
                        {submitting ? t('eventDetail.reserving') : t('eventDetail.reserve')}
                      </button>
                    </div>
                  )}
                </>
              )}
            </section>
          )}
        </div>
      </div>
    </main>
  )
}
