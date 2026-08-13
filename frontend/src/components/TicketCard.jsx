import { useState } from 'react'
import { useLocale } from '../context/LocaleContext'
import { formatEventDate } from '../lib/format'
import './TicketCard.css'

export function TicketCard({ ticket, onCancel, cancelling }) {
  const { event, seat } = ticket
  const { t, locale } = useLocale()
  const [copied, setCopied] = useState(false)

  function handleShare() {
    const url = `${window.location.origin}/tickets/${ticket.public_code}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <article className={`ticket-card ticket-card--${ticket.status}`}>
      <div className="ticket-card__info">
        <span className={`ticket-card__tag ticket-card__tag--${event.category}`}>
          {t(`common.category.${event.category}`)}
        </span>
        <h3 className="ticket-card__title">{event.title}</h3>
        <p className="ticket-card__venue">
          {event.venue} · {formatEventDate(event.date, locale)}
        </p>
        <p className="ticket-card__seat">
          {seat
            ? t('ticketCard.seatLabel', { row: seat.row, col: seat.col })
            : t('ticketCard.looseTicket')}
        </p>
        {ticket.status !== 'valid' && (
          <span className="ticket-card__status">{t(`ticketCard.status.${ticket.status}`)}</span>
        )}
      </div>
      <div className="ticket-card__seam" aria-hidden="true" />
      <div className="ticket-card__action">
        <img className="ticket-card__qr" src={ticket.qr_image} alt="" />
        <span className="ticket-card__code">{ticket.public_code}</span>
        <button type="button" className="ticket-card__share" onClick={handleShare}>
          {copied ? t('ticketCard.copied') : t('ticketCard.copyLink')}
        </button>
        {onCancel && ticket.status === 'valid' && (
          <button
            type="button"
            className="ticket-card__cancel"
            onClick={onCancel}
            disabled={cancelling}
          >
            {cancelling ? t('ticketCard.cancelling') : t('ticketCard.cancelReservation')}
          </button>
        )}
      </div>
    </article>
  )
}
