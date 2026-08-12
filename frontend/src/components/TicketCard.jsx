import { formatEventDate } from '../lib/format'
import './TicketCard.css'

const CATEGORY_LABEL = { show: 'Show', movie: 'Filme' }
const STATUS_LABEL = { valid: 'Válido', used: 'Utilizado', cancelled: 'Cancelado' }

export function TicketCard({ ticket }) {
  const { event, seat } = ticket

  return (
    <article className={`ticket-card ticket-card--${ticket.status}`}>
      <div className="ticket-card__info">
        <span className={`ticket-card__tag ticket-card__tag--${event.category}`}>
          {CATEGORY_LABEL[event.category]}
        </span>
        <h3 className="ticket-card__title">{event.title}</h3>
        <p className="ticket-card__venue">
          {event.venue} · {formatEventDate(event.date)}
        </p>
        <p className="ticket-card__seat">
          {seat ? `Assento ${seat.row}${seat.col}` : 'Ingresso avulso'}
        </p>
        {ticket.status !== 'valid' && (
          <span className="ticket-card__status">{STATUS_LABEL[ticket.status]}</span>
        )}
      </div>
      <div className="ticket-card__seam" aria-hidden="true" />
      <div className="ticket-card__action">
        <img className="ticket-card__qr" src={ticket.qr_image} alt="" />
        <span className="ticket-card__code">{ticket.public_code}</span>
      </div>
    </article>
  )
}
