import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getPublicTicket } from '../api/tickets'
import { TicketCard } from '../components/TicketCard'
import { useLocale } from '../context/LocaleContext'
import { translateApiError } from '../lib/apiErrors'
import './PublicTicketPage.css'

export function PublicTicketPage() {
  const { code } = useParams()
  const { t } = useLocale()
  const [ticket, setTicket] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    setError(null)
    setTicket(null)
    getPublicTicket(code)
      .then(setTicket)
      .catch((err) => setError(translateApiError(err, t)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code])

  return (
    <main className="public-ticket-page">
      {error ? (
        <p className="public-ticket-page__state public-ticket-page__state--error">{error}</p>
      ) : !ticket ? (
        <p className="public-ticket-page__state">{t('publicTicket.loading')}</p>
      ) : (
        <TicketCard ticket={ticket} />
      )}
    </main>
  )
}
