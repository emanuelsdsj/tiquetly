import { useEffect, useState } from 'react'
import { getMyEvents } from '../api/events'
import { translateApiError } from '../lib/apiErrors'

export function useMyEvents({ user, token, t }) {
  const [events, setEvents] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (user?.role !== 'organizer') return
    getMyEvents(token)
      .then(setEvents)
      .catch((err) => setError(translateApiError(err, t)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, token])

  return { events, setEvents, error }
}
