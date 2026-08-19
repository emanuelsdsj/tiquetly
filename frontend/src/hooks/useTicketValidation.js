import { useState } from 'react'
import { validateTicket } from '../api/gate'
import { translateApiError } from '../lib/apiErrors'

export function useTicketValidation({ eventId, token, t, setError }) {
  const [result, setResult] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  async function submitCode(code) {
    setSubmitting(true)
    setError(null)
    try {
      const data = await validateTicket({ event_id: Number(eventId), code }, token)
      setResult(data)
    } catch (err) {
      setError(translateApiError(err, t))
    } finally {
      setSubmitting(false)
    }
  }

  return { result, setResult, submitting, submitCode }
}
