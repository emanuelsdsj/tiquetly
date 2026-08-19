import { useEffect, useState } from 'react'
import { searchEvents } from '../api/events'
import { translateApiError } from '../lib/apiErrors'

function todayRange() {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date()
  end.setHours(23, 59, 59, 999)
  return { date_from: start.toISOString(), date_to: end.toISOString() }
}

export function useTodaysEvents(user, t, setError) {
  const [events, setEvents] = useState(null)

  useEffect(() => {
    if (user?.role !== 'gatekeeper') return
    searchEvents(todayRange())
      .then(setEvents)
      .catch((err) => setError(translateApiError(err, t)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  return events
}
