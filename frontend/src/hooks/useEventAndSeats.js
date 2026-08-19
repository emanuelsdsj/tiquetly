import { useEffect, useState } from 'react'
import { getEvent, getEventSeats } from '../api/events'
import { translateApiError } from '../lib/apiErrors'

export function useEventAndSeats(id, t) {
  const [event, setEvent] = useState(null)
  const [error, setError] = useState(null)
  const [seats, setSeats] = useState(null)

  useEffect(() => {
    setError(null)
    setEvent(null)
    getEvent(id)
      .then(setEvent)
      .catch((err) => setError(translateApiError(err, t)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => {
    if (event?.reservation_mode !== 'seatmap') return
    getEventSeats(id)
      .then(setSeats)
      .catch((err) => setError(translateApiError(err, t)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, event])

  return { event, setEvent, error, seats, setSeats }
}
