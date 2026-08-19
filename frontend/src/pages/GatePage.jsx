import { Html5Qrcode } from 'html5-qrcode'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLocale } from '../context/LocaleContext'
import { useTicketValidation } from '../hooks/useTicketValidation'
import { useTodaysEvents } from '../hooks/useTodaysEvents'
import { GateEventSelect } from './GateEventSelect'
import { GateManualEntry } from './GateManualEntry'
import { GateModeToggle } from './GateModeToggle'
import { GateResultPanel } from './GateResultPanel'
import './GatePage.css'

const READER_ELEMENT_ID = 'gate-qr-reader'

export function GatePage() {
  const { token, user } = useAuth()
  const { t, locale } = useLocale()
  const [error, setError] = useState(null)
  const [eventId, setEventId] = useState('')
  const [mode, setMode] = useState('camera')
  const [manualCode, setManualCode] = useState('')
  const scannerRef = useRef(null)

  const events = useTodaysEvents(user, t, setError)
  const { result, setResult, submitting, submitCode } = useTicketValidation({
    eventId,
    token,
    t,
    setError,
  })

  function handleEventChange(changeEvent) {
    setEventId(changeEvent.target.value)
    setResult(null)
  }

  function handleModeChange(nextMode) {
    setMode(nextMode)
    setResult(null)
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
          <Link to="/login">{t('common.signInLinkText')}</Link> {t('gate.signInPrefix')}
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

      <GateEventSelect
        events={events}
        error={error}
        eventId={eventId}
        onChange={handleEventChange}
        t={t}
      />

      {events === null && error && <p className="gate-page__error">{error}</p>}

      {events && events.length === 0 && (
        <p className="gate-page__state">{t('gate.noEventsToday')}</p>
      )}

      {eventId && (
        <div className="gate-page__layout">
          <div className="gate-page__controls">
            <GateModeToggle mode={mode} onModeChange={handleModeChange} t={t} />

            {result ? (
              <p className="gate-page__paused">{t('gate.pausedAfterValidation')}</p>
            ) : mode === 'camera' ? (
              <div id={READER_ELEMENT_ID} className="gate-page__reader" />
            ) : (
              <GateManualEntry
                value={manualCode}
                onChange={(changeEvent) => setManualCode(changeEvent.target.value)}
                onSubmit={handleManualSubmit}
                submitting={submitting}
                t={t}
              />
            )}

            {error && <p className="gate-page__error">{error}</p>}
          </div>

          <GateResultPanel result={result} onNext={handleNext} t={t} locale={locale} />
        </div>
      )}
    </main>
  )
}
