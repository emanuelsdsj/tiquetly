import { Link } from 'react-router-dom'
import { PaymentForm } from '../components/PaymentForm'
import { ReservationCountdown } from '../components/ReservationCountdown'

export function EventDetailGeneralSection({
  event,
  user,
  t,
  quantity,
  setQuantity,
  remaining,
  reservation,
  reserveError,
  submitting,
  declinedMessage,
  cancelError,
  cancelling,
  onReserveGeneral,
  onCancelReservation,
  onPaid,
  onDeclined,
  onExpired,
}) {
  return (
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
            <ReservationCountdown createdAt={reservation.created_at} onExpire={onExpired} />
            <PaymentForm
              reservation={reservation}
              amount={event.price * reservation.quantity}
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
      ) : remaining <= 0 ? (
        <p className="event-detail-page__state">{t('eventDetail.soldOut')}</p>
      ) : !user ? (
        <p className="event-detail-page__state">
          <Link to="/login">{t('common.signInLinkText')}</Link> {t('eventDetail.toReserveTicket')}
        </p>
      ) : (
        <form className="event-detail-page__form" onSubmit={onReserveGeneral}>
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
  )
}
