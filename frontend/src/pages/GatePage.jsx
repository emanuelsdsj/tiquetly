import { Html5Qrcode } from 'html5-qrcode'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { searchEvents } from '../api/events'
import { validateTicket } from '../api/gate'
import { Spinner } from '../components/Spinner'
import { useAuth } from '../context/AuthContext'
import { useLocale } from '../context/LocaleContext'
import { translateApiError } from '../lib/apiErrors'
import { formatEventDate } from '../lib/format'
import './GatePage.css'

const READER_ELEMENT_ID = 'gate-qr-reader'

function todayRange() {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date()
  end.setHours(23, 59, 59, 999)
  return { date_from: start.toISOString(), date_to: end.toISOString() }
}

export function GatePage() {
  const { token, user } = useAuth()
  const [events, setEvents] = useState(null)
  const [eventId, setEventId] = useState('')
  const [mode, setMode] = useState('camera')
  const [manualCode, setManualCode] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const scannerRef = useRef(null)
  const { t, locale } = useLocale()

  useEffect(() => {
    if (user?.role !== 'gatekeeper') return
    searchEvents(todayRange())
      .then(setEvents)
      .catch((err) => setError(translateApiError(err, t)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

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

  useEffect(() => {
    if (mode !== 'camera' || !eventId || result) return

    const scanner = new Html5Qrcode(READER_ELEMENT_ID)
    scannerRef.current = scanner
    let handled = false
    let started = false
    let cancelled = false

    function stopAndClear() {
      scanner
        .stop()
        .then(() => scanner.clear())
        .catch(() => {})
    }

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: 220 },
        (decodedText) => {
          if (handled) return
          handled = true
          scanner.pause(true)
          submitCode(decodedText)
        },
        () => {},
      )
      .then(() => {
        started = true
        // The effect may have already been cleaned up (mode/event
        // changed) while start() was still pending; stop it now instead
        // of leaving an orphaned camera stream running.
        if (cancelled) stopAndClear()
      })
      .catch(() => setError(t('gate.cameraError')))

    return () => {
      cancelled = true
      // stop() throws if the scanner never actually reached the running
      // state (start() still pending or rejected), so only call it once
      // start() is confirmed, here or in the .then() above.
      if (started) stopAndClear()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, eventId, result])

  function handleManualSubmit(formEvent) {
    formEvent.preventDefault()
    if (!manualCode.trim() || submitting) return
    submitCode(manualCode.trim())
  }

  function handleNext() {
    setResult(null)
    setError(null)
    setManualCode('')
  }

  if (!user) {
    return (
      <main className="gate-page">
        <p className="gate-page__state">
          <Link to="/entrar">{t('common.signInLinkText')}</Link> {t('gate.signInPrefix')}
        </p>
      </main>
    )
  }

  if (user.role !== 'gatekeeper') {
    return (
      <main className="gate-page">
        <p className="gate-page__state">{t('gate.restricted')}</p>
      </main>
    )
  }

  return (
    <main className="gate-page">
      <header className="gate-page__head">
        <h1 className="gate-page__title">{t('gate.title')}</h1>
        <p className="gate-page__subtitle">{t('gate.subtitle')}</p>
      </header>

      <label className="gate-page__field">
        {t('gate.eventLabel')}
        {events === null && !error ? (
          <span className="gate-page__field-loading">
            <Spinner />
            {t('gate.loadingEvents')}
          </span>
        ) : (
          <select
            value={eventId}
            onChange={(changeEvent) => {
              setEventId(changeEvent.target.value)
              setResult(null)
            }}
          >
            <option value="">{t('gate.selectEvent')}</option>
            {events?.map((event) => (
              <option key={event.id} value={event.id}>
                {event.title} · {event.venue}
              </option>
            ))}
          </select>
        )}
      </label>

      {events === null && error && <p className="gate-page__error">{error}</p>}

      {events && events.length === 0 && (
        <p className="gate-page__state">{t('gate.noEventsToday')}</p>
      )}

      {eventId && (
        <div className="gate-page__layout">
          <div className="gate-page__controls">
            <div className="gate-page__mode" role="group" aria-label={t('gate.modeAriaLabel')}>
              <button
                type="button"
                className={mode === 'camera' ? 'gate-page__mode-button--active' : ''}
                onClick={() => {
                  setMode('camera')
                  setResult(null)
                }}
              >
                {t('gate.camera')}
              </button>
              <button
                type="button"
                className={mode === 'manual' ? 'gate-page__mode-button--active' : ''}
                onClick={() => {
                  setMode('manual')
                  setResult(null)
                }}
              >
                {t('gate.manualEntry')}
              </button>
            </div>

            {result ? (
              <p className="gate-page__paused">{t('gate.pausedAfterValidation')}</p>
            ) : mode === 'camera' ? (
              <div id={READER_ELEMENT_ID} className="gate-page__reader" />
            ) : (
              <form className="gate-page__manual" onSubmit={handleManualSubmit}>
                <input
                  type="text"
                  placeholder={t('gate.codePlaceholder')}
                  value={manualCode}
                  onChange={(changeEvent) => setManualCode(changeEvent.target.value)}
                  autoFocus
                />
                <button type="submit" disabled={submitting}>
                  {submitting ? t('gate.validating') : t('gate.validate')}
                </button>
              </form>
            )}

            {error && <p className="gate-page__error">{error}</p>}
          </div>

          <div className="gate-page__result-column">
            {result ? (
              <div
                className={`gate-page__result gate-page__result--${result.outcome === 'valid' ? 'valid' : 'reject'}`}
              >
                <h2 className="gate-page__result-title">
                  {t(`gate.outcomeLabel.${result.outcome}`)}
                </h2>
                <p className="gate-page__result-detail">
                  {t(`gate.outcomeDetail.${result.outcome}`)}
                </p>
                {result.outcome === 'wrong_event' && result.event_title && (
                  <p className="gate-page__result-meta">
                    {t('gate.eventOfTicket', { title: result.event_title })}
                  </p>
                )}
                {result.seat && (
                  <p className="gate-page__result-meta">
                    {t('gate.seatLabel', { row: result.seat.row, col: result.seat.col })}
                  </p>
                )}
                {result.outcome === 'already_used' && result.used_at && (
                  <p className="gate-page__result-meta">
                    {t('gate.usedAt', { when: formatEventDate(result.used_at, locale) })}
                  </p>
                )}
                <button type="button" className="gate-page__next" onClick={handleNext}>
                  {t('gate.validateNext')}
                </button>
              </div>
            ) : (
              <div className="gate-page__result-placeholder">
                <p>{t('gate.waitingForScan')}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  )
}
