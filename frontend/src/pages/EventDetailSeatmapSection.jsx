import { Link } from 'react-router-dom'
import { PaymentForm } from '../components/PaymentForm'
import { ReservationCountdown } from '../components/ReservationCountdown'
import { SeatMap } from '../components/SeatMap'
import { Spinner } from '../components/Spinner'
import { formatPrice } from '../lib/format'

export function EventDetailSeatmapSection({
  event,
  user,
  t,
  locale,
  seats,
  selectedSeatIds,
  onToggleSeat,
  selectedSeatLabels,
  seatLabelsPlural,
  reservation,
  reserveError,
  submitting,
  declinedMessage,
  cancelError,
  cancelling,
  onReserveSeats,
  onCancelReservation,
  onPaid,
  onDeclined,
  onExpired,
}) {
  return (
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
            <ReservationCountdown createdAt={reservation.created_at} onExpire={onExpired} />
            <PaymentForm
              reservation={reservation}
              amount={event.price * selectedSeatIds.length}
              onPaid={onPaid}
              onDeclined={onDeclined}
            />
            {cancelError && <p className="event-detail-page__error">{cancelError}</p>}
            <button
              type="button"
              className="event-detail-page__cancel"
              onClick={onCancelReservation}
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
            onToggle={onToggleSeat}
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
                onClick={onReserveSeats}
              >
                {submitting ? t('eventDetail.reserving') : t('eventDetail.reserve')}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  )
}
