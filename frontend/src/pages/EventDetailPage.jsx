import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getEvent, reserveGeneral } from '../api/events'
import { useAuth } from '../context/AuthContext'
import { formatEventDate, formatPrice } from '../lib/format'
import './EventDetailPage.css'

const CATEGORY_LABEL = { show: 'Show', movie: 'Filme' }

export function EventDetailPage() {
  const { id } = useParams()
  const { token, user } = useAuth()
  const [event, setEvent] = useState(null)
  const [error, setError] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [reservation, setReservation] = useState(null)
  const [reserveError, setReserveError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    setError(null)
    setEvent(null)
    getEvent(id)
      .then(setEvent)
      .catch((err) => setError(err.message))
  }, [id])

  async function handleReserve(formEvent) {
    formEvent.preventDefault()
    setSubmitting(true)
    setReserveError(null)
    try {
      const created = await reserveGeneral(id, quantity, token)
      setReservation(created)
    } catch (err) {
      setReserveError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (error)
    return <p className="event-detail-page__state event-detail-page__state--error">{error}</p>
  if (!event) return <p className="event-detail-page__state">Carregando evento...</p>

  const remaining = event.capacity - event.reserved_count

  return (
    <main className="event-detail-page">
      <span className={`event-detail-page__tag event-detail-page__tag--${event.category}`}>
        {CATEGORY_LABEL[event.category]}
      </span>
      <h1 className="event-detail-page__title">{event.title}</h1>
      <p className="event-detail-page__venue">
        {event.venue} · {formatEventDate(event.date)}
      </p>
      {event.description && <p className="event-detail-page__description">{event.description}</p>}
      <p className="event-detail-page__price">{formatPrice(event.price)}</p>

      {event.reservation_mode === 'general' && (
        <section className="event-detail-page__reserve">
          {reservation ? (
            <p className="event-detail-page__confirmation">
              Reserva feita: {reservation.quantity}{' '}
              {reservation.quantity === 1 ? 'ingresso' : 'ingressos'}, aguardando pagamento.
            </p>
          ) : remaining <= 0 ? (
            <p className="event-detail-page__state">Ingressos esgotados para este evento.</p>
          ) : !user ? (
            <p className="event-detail-page__state">
              <Link to="/entrar">Entre</Link> para reservar seu ingresso.
            </p>
          ) : (
            <form className="event-detail-page__form" onSubmit={handleReserve}>
              <div className="event-detail-page__quantity">
                <span>Quantidade</span>
                <div className="quantity-stepper">
                  <button
                    type="button"
                    className="quantity-stepper__button"
                    onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                    disabled={quantity <= 1}
                    aria-label="Diminuir quantidade"
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
                    aria-label="Aumentar quantidade"
                  >
                    +
                  </button>
                </div>
              </div>
              <span className="event-detail-page__remaining">{remaining} disponíveis</span>
              {reserveError && <p className="event-detail-page__error">{reserveError}</p>}
              <button type="submit" disabled={submitting}>
                {submitting ? 'Reservando...' : 'Reservar'}
              </button>
            </form>
          )}
        </section>
      )}
    </main>
  )
}
