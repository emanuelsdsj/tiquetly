import { Link } from 'react-router-dom'
import { useLocale } from '../context/LocaleContext'
import { formatEventDate, formatPrice } from '../lib/format'
import './EventCard.css'

export function EventCard({ event }) {
  const { t, locale } = useLocale()
  return (
    <Link to={`/events/${event.id}`} className="event-card">
      {event.image && (
        <img className="event-card__image" src={event.image} alt="" aria-hidden="true" />
      )}
      <div className="event-card__info">
        <span className={`event-card__tag event-card__tag--${event.category}`}>
          {t(`common.category.${event.category}`)}
        </span>
        <h3 className="event-card__title">{event.title}</h3>
        <p className="event-card__venue">
          {event.venue} · {formatEventDate(event.date, locale)}
        </p>
        {event.description && <p className="event-card__description">{event.description}</p>}
      </div>
      <div className="event-card__seam" aria-hidden="true" />
      <div className="event-card__action">
        <span className="event-card__price">{formatPrice(event.price, locale)}</span>
      </div>
    </Link>
  )
}
