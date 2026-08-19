import { useParams } from 'react-router-dom'
import { Spinner } from '../components/Spinner'
import { useAuth } from '../context/AuthContext'
import { useLocale } from '../context/LocaleContext'
import { useEventAndSeats } from '../hooks/useEventAndSeats'
import { useReservation } from '../hooks/useReservation'
import { describeSelectedSeats, remainingCapacity } from '../lib/eventDetail'
import { formatEventDate, formatPrice } from '../lib/format'
import { EventDetailGeneralSection } from './EventDetailGeneralSection'
import { EventDetailSeatmapSection } from './EventDetailSeatmapSection'
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
            <EventDetailGeneralSection
              event={event}
              user={user}
              t={t}
              quantity={quantity}
              setQuantity={setQuantity}
              remaining={remaining}
              reservation={reservation}
              reserveError={reserveError}
              submitting={submitting}
              declinedMessage={declinedMessage}
              cancelError={cancelError}
              cancelling={cancelling}
              onReserveGeneral={handleReserveGeneral}
              onCancelReservation={handleCancelReservation}
              onPaid={setReservation}
              onDeclined={handleDeclined}
              onExpired={handleExpired}
            />
          )}

          {event.reservation_mode === 'seatmap' && (
            <EventDetailSeatmapSection
              event={event}
              user={user}
              t={t}
              locale={locale}
              seats={seats}
              selectedSeatIds={selectedSeatIds}
              onToggleSeat={toggleSeat}
              selectedSeatLabels={selectedSeatLabels}
              seatLabelsPlural={seatLabelsPlural}
              reservation={reservation}
              reserveError={reserveError}
              submitting={submitting}
              declinedMessage={declinedMessage}
              cancelError={cancelError}
              cancelling={cancelling}
              onReserveSeats={handleReserveSeats}
              onCancelReservation={handleCancelReservation}
              onPaid={setReservation}
              onDeclined={handleDeclined}
              onExpired={handleExpired}
            />
          )}
        </div>
      </div>
    </main>
  )
}
