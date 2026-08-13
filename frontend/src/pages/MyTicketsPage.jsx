import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { cancelReservation } from '../api/reservations'
import { getMyTickets } from '../api/tickets'
import { Spinner } from '../components/Spinner'
import { TicketCard } from '../components/TicketCard'
import { useAuth } from '../context/AuthContext'
import { useLocale } from '../context/LocaleContext'
import { translateApiError } from '../lib/apiErrors'
import './MyTicketsPage.css'

export function MyTicketsPage() {
  const { token, user } = useAuth()
  const { t } = useLocale()
  const [tickets, setTickets] = useState(null)
  const [error, setError] = useState(null)
  const [cancellingId, setCancellingId] = useState(null)
  const [cancelError, setCancelError] = useState(null)

  useEffect(() => {
    if (!token) return
    getMyTickets(token)
      .then(setTickets)
      .catch((err) => setError(translateApiError(err, t)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  async function handleCancel(reservationId) {
    const count = tickets.filter((ticket) => ticket.reservation_id === reservationId).length
    const confirmed = window.confirm(
      count > 1 ? t('myTickets.confirmCancelMany', { count }) : t('myTickets.confirmCancelOne'),
    )
    if (!confirmed) return

    setCancellingId(reservationId)
    setCancelError(null)
    try {
      await cancelReservation(reservationId, token)
      setTickets((current) =>
        current.map((ticket) =>
          ticket.reservation_id === reservationId ? { ...ticket, status: 'cancelled' } : ticket,
        ),
      )
    } catch (err) {
      setCancelError(translateApiError(err, t))
    } finally {
      setCancellingId(null)
    }
  }

  return (
    <main className="my-tickets-page">
      <header className="my-tickets-page__head">
        <h1 className="my-tickets-page__title">{t('myTickets.title')}</h1>
        <p className="my-tickets-page__subtitle">{t('myTickets.subtitle')}</p>
      </header>

      {!user ? (
        <p className="my-tickets-page__state">
          <Link to="/login">{t('common.signInLinkText')}</Link> {t('myTickets.toViewTickets')}
        </p>
      ) : error ? (
        <p className="my-tickets-page__state my-tickets-page__state--error">{error}</p>
      ) : tickets === null ? (
        <p className="my-tickets-page__state">
          <Spinner />
          {t('myTickets.loading')}
        </p>
      ) : tickets.length === 0 ? (
        <p className="my-tickets-page__state">
          {t('myTickets.emptyPrefix')} <Link to="/">{t('myTickets.findEventLinkText')}</Link>{' '}
          {t('myTickets.emptySuffix')}
        </p>
      ) : (
        <>
          {cancelError && (
            <p className="my-tickets-page__state my-tickets-page__state--error">{cancelError}</p>
          )}
          <div className="my-tickets-page__grid">
            {tickets.map((ticket) => (
              <TicketCard
                key={ticket.id}
                ticket={ticket}
                onCancel={() => handleCancel(ticket.reservation_id)}
                cancelling={cancellingId === ticket.reservation_id}
              />
            ))}
          </div>
        </>
      )}
    </main>
  )
}
