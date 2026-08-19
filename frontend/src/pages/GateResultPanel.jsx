import { formatEventDate } from '../lib/format'

export function GateResultPanel({ result, onNext, t, locale }) {
  return (
    <div className="gate-page__result-column">
      {result ? (
        <div
          className={`gate-page__result gate-page__result--${result.outcome === 'valid' ? 'valid' : 'reject'}`}
        >
          <h2 className="gate-page__result-title">{t(`gate.outcomeLabel.${result.outcome}`)}</h2>
          <p className="gate-page__result-detail">{t(`gate.outcomeDetail.${result.outcome}`)}</p>
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
          <button type="button" className="gate-page__next" onClick={onNext}>
            {t('gate.validateNext')}
          </button>
        </div>
      ) : (
        <div className="gate-page__result-placeholder">
          <p>{t('gate.waitingForScan')}</p>
        </div>
      )}
    </div>
  )
}
