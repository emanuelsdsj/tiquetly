import { Html5Qrcode } from 'html5-qrcode'
import { useEffect, useRef } from 'react'

export const READER_ELEMENT_ID = 'gate-qr-reader'

export function useQrScanner({ mode, eventId, result, onDecode, onCameraError }) {
  const scannerRef = useRef(null)

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
          onDecode(decodedText)
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
      .catch(() => onCameraError())

    return () => {
      cancelled = true
      // stop() throws if the scanner never actually reached the running
      // state (start() still pending or rejected), so only call it once
      // start() is confirmed, here or in the .then() above.
      if (started) stopAndClear()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, eventId, result])
}
