import { useEffect, useState } from 'react'
import { useLocale } from '../context/LocaleContext'
import './ReservationCountdown.css'

// Mirrors the backend's own TTL (reservation_service.RESERVATION_PENDING_TTL_MINUTES,
// ADR 0024): purely informational on this side, the server is what actually
// releases the stock, this just tells the customer the same deadline.
const TTL_MINUTES = 10

function formatRemaining(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

export function ReservationCountdown({ createdAt, onExpire }) {
  const { t } = useLocale()
  const deadline = new Date(createdAt).getTime() + TTL_MINUTES * 60 * 1000
  const [remaining, setRemaining] = useState(deadline - Date.now())

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(deadline - Date.now())
    }, 1000)
    return () => clearInterval(interval)
  }, [deadline])

  useEffect(() => {
    if (remaining <= 0) onExpire()
  }, [remaining, onExpire])

  if (remaining <= 0) return null

  return (
    <p className="reservation-countdown">
      {t('eventDetail.expiresIn', { time: formatRemaining(remaining) })}
    </p>
  )
}
