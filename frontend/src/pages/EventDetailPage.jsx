import { Link, useParams } from 'react-router-dom'
import { PaymentForm } from '../components/PaymentForm'
import { ReservationCountdown } from '../components/ReservationCountdown'
import { SeatMap } from '../components/SeatMap'
import { Spinner } from '../components/Spinner'
import { useAuth } from '../context/AuthContext'
import { useLocale } from '../context/LocaleContext'
import { useEventAndSeats } from '../hooks/useEventAndSeats'
import { useReservation } from '../hooks/useReservation'
import { describeSelectedSeats, remainingCapacity } from '../lib/eventDetail'
import { formatEventDate, formatPrice } from '../lib/format'
import './EventDetailPage.css'

export function EventDetailPage() {
  const { id } = useParams()
  const { token, user } = useAuth()
  const { t, locale } = useLocale()
  const { event, setEvent, error, seats, setSeats } = useEventAndSeats(id, t)
  const {
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
  } = useReservation({ id, token, t, event, setEvent, seats, setSeats })

  if (error)
    return <p className="event-detail-page__state event-detail-page__state--error">{error}</p>
  if (!event)
    return (
      <p className="event-detail-page__state">
        <Spinner />
        {t('eventDetail.loading')}
      </p>
    )

  const remaining = remainingCapacity(event)
  const { selectedSeatLabels, seatLabelsPlural } = describeSelectedSeats(seats, selectedSeatIds)

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
