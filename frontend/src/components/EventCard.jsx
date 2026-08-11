import { Link } from 'react-router-dom'
import { formatEventDate, formatPrice } from '../lib/format'
import './EventCard.css'

const CATEGORY_LABEL = { show: 'Show', movie: 'Filme' }

export function EventCard({ event }) {
  // Only general-admission events can be reserved so far (step 9); seatmap
  // events (step 10) stay informational until that flow exists, rather
  // than linking to a detail page with nothing to do on it.
  const reservable = event.reservation_mode === 'general'

  const content = (
    <>
      <div className="event-card__info">
        <span className={`event-card__tag event-card__tag--${event.category}`}>
          {CATEGORY_LABEL[event.category]}
        </span>
        <h3 className="event-card__title">{event.title}</h3>
        <p className="event-card__venue">
          {event.venue} · {formatEventDate(event.date)}
        </p>
        {event.description && <p className="event-card__description">{event.description}</p>}
      </div>
      <div className="event-card__seam" aria-hidden="true" />
      <div className="event-card__action">
        <span className="event-card__price">{formatPrice(event.price)}</span>
      </div>
    </>
  )

  if (reservable) {
    return (
      <Link to={`/eventos/${event.id}`} className="event-card">
        {content}
      </Link>
    )
  }

  return <article className="event-card">{content}</article>
}
