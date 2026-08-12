import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { cancelReservation } from '../api/reservations'
import { getMyTickets } from '../api/tickets'
import { TicketCard } from '../components/TicketCard'
import { useAuth } from '../context/AuthContext'
import './MyTicketsPage.css'

export function MyTicketsPage() {
  const { token, user } = useAuth()
  const [tickets, setTickets] = useState(null)
  const [error, setError] = useState(null)
  const [cancellingId, setCancellingId] = useState(null)
  const [cancelError, setCancelError] = useState(null)

  useEffect(() => {
    if (!token) return
    getMyTickets(token)
      .then(setTickets)
      .catch((err) => setError(err.message))
  }, [token])

  async function handleCancel(reservationId) {
    const count = tickets.filter((ticket) => ticket.reservation_id === reservationId).length
    const confirmed = window.confirm(
      count > 1
        ? `Cancelar essa reserva? Os ${count} ingressos dela deixam de valer.`
        : 'Cancelar essa reserva? O ingresso deixa de valer.',
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
      setCancelError(err.message)
    } finally {
      setCancellingId(null)
    }
  }

  return (
    <main className="my-tickets-page">
      <header className="my-tickets-page__head">
        <h1 className="my-tickets-page__title">Meus ingressos</h1>
        <p className="my-tickets-page__subtitle">
          Seus ingressos confirmados, com QR pra portaria.
        </p>
      </header>

      {!user ? (
        <p className="my-tickets-page__state">
          <Link to="/entrar">Entre</Link> para ver seus ingressos.
        </p>
      ) : error ? (
        <p className="my-tickets-page__state my-tickets-page__state--error">{error}</p>
      ) : tickets === null ? (
        <p className="my-tickets-page__state">Carregando ingressos...</p>
      ) : tickets.length === 0 ? (
        <p className="my-tickets-page__state">
          Você ainda não tem ingressos. <Link to="/">Encontre um evento</Link> e reserve seu lugar.
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
