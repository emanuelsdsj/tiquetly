import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getMyTickets } from '../api/tickets'
import { TicketCard } from '../components/TicketCard'
import { useAuth } from '../context/AuthContext'
import './MyTicketsPage.css'

export function MyTicketsPage() {
  const { token, user } = useAuth()
  const [tickets, setTickets] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!token) return
    getMyTickets(token)
      .then(setTickets)
      .catch((err) => setError(err.message))
  }, [token])

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
        <div className="my-tickets-page__grid">
          {tickets.map((ticket) => (
            <TicketCard key={ticket.id} ticket={ticket} />
          ))}
        </div>
      )}
    </main>
  )
}
