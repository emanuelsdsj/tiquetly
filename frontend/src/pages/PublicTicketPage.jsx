import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getPublicTicket } from '../api/tickets'
import { TicketCard } from '../components/TicketCard'
import './PublicTicketPage.css'

export function PublicTicketPage() {
  const { code } = useParams()
  const [ticket, setTicket] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    setError(null)
    setTicket(null)
    getPublicTicket(code)
      .then(setTicket)
      .catch((err) => setError(err.message))
  }, [code])

  return (
    <main className="public-ticket-page">
      {error ? (
        <p className="public-ticket-page__state public-ticket-page__state--error">{error}</p>
      ) : !ticket ? (
        <p className="public-ticket-page__state">Carregando ingresso...</p>
      ) : (
        <TicketCard ticket={ticket} />
      )}
    </main>
  )
}
