import { Spinner } from '../components/Spinner'

export function GateEventSelect({ events, error, eventId, onChange, t }) {
  return (
    <label className="gate-page__field">
      {t('gate.eventLabel')}
      {events === null && !error ? (
        <span className="gate-page__field-loading">
          <Spinner />
          {t('gate.loadingEvents')}
        </span>
      ) : (
        <select value={eventId} onChange={onChange}>
          <option value="">{t('gate.selectEvent')}</option>
          {events?.map((event) => (
            <option key={event.id} value={event.id}>
              {event.title} · {event.venue}
            </option>
          ))}
        </select>
      )}
    </label>
  )
}
