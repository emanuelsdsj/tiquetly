import { formatEventDate, toDatetimeLocalValue } from '../lib/format'

export function CreateEventDetailsForm({
  selected,
  form,
  setForm,
  reservationMode,
  submitting,
  submitError,
  onSubmit,
  onBackToSearch,
  t,
  locale,
}) {
  return (
    <div className="create-event-page__layout">
      <div className="catalog-result catalog-result--picked">
        {selected.image && (
          <img className="catalog-result__image" src={selected.image} alt="" aria-hidden="true" />
        )}
        <div className="catalog-result__info">
          <h3 className="catalog-result__title">{selected.title}</h3>
          <p className="catalog-result__meta">
            {[
              t(`createEvent.category.${selected.category}`),
              selected.venue,
              selected.date ? formatEventDate(selected.date, locale) : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
        <button type="button" className="catalog-result__select" onClick={onBackToSearch}>
          {t('createEvent.change')}
        </button>
      </div>

      <form className="create-event-page__details" onSubmit={onSubmit}>
        <label>
          {t('createEvent.formDateTime')}
          <input
            type="datetime-local"
            value={form.date}
            min={toDatetimeLocalValue(new Date().toISOString())}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            required
          />
        </label>
        <label>
          {t('createEvent.formVenue')}
          <input
            type="text"
            value={form.venue}
            onChange={(e) => setForm({ ...form, venue: e.target.value })}
            required
          />
        </label>
        <div className="create-event-page__details-row">
          <label>
            {t('createEvent.formCapacity')}
            <input
              type="number"
              min="1"
              step="1"
              value={form.capacity}
              onChange={(e) => setForm({ ...form, capacity: e.target.value })}
              required
            />
          </label>
          <label>
            {t('createEvent.formPrice')}
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              required
            />
          </label>
        </div>
        <p className="create-event-page__hint">
          {t('createEvent.reservationModeHint', {
            mode: t(`createEvent.reservationMode.${reservationMode}`),
          })}
        </p>

        {submitError && (
          <p className="create-event-page__state create-event-page__state--error">{submitError}</p>
        )}

        <button type="submit" className="create-event-page__publish" disabled={submitting}>
          {submitting ? t('createEvent.publishing') : t('createEvent.publish')}
        </button>
      </form>
    </div>
  )
}
