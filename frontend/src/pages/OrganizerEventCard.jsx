import { formatEventDate, formatPrice, toDatetimeLocalValue } from '../lib/format'

export function OrganizerEventCard({
  event,
  editingId,
  form,
  setForm,
  savingId,
  onStartEdit,
  onCancelEdit,
  onSave,
  onUnpublish,
  t,
  locale,
}) {
  return (
    <li className="organizer-event">
      <div className="organizer-event__row">
        <div className="organizer-event__info">
          <span className={`organizer-event__tag organizer-event__tag--${event.category}`}>
            {t(`organizer.category.${event.category}`)}
          </span>
          <span className={`organizer-event__status organizer-event__status--${event.status}`}>
            {t(`organizer.status.${event.status}`)}
          </span>
          <h2 className="organizer-event__title">{event.title}</h2>
          <p className="organizer-event__meta">
            {event.venue} · {formatEventDate(event.date, locale)} ·{' '}
            {formatPrice(event.price, locale)}
          </p>
          <p className="organizer-event__meta">
            {t('organizer.reservedOf', {
              reserved: event.reserved_count,
              capacity: event.capacity,
            })}
          </p>
        </div>
        <div className="organizer-event__actions">
          <button type="button" onClick={() => onStartEdit(event)} disabled={savingId === event.id}>
            {t('organizer.edit')}
          </button>
          {event.status === 'published' && (
            <button
              type="button"
              className="organizer-event__unpublish"
              onClick={() => onUnpublish(event)}
              disabled={savingId === event.id}
            >
              {savingId === event.id ? t('organizer.unpublishing') : t('organizer.unpublish')}
            </button>
          )}
        </div>
      </div>

      {editingId === event.id && (
        <form
          className="organizer-event__form"
          onSubmit={(formEvent) => {
            formEvent.preventDefault()
            onSave(event.id)
          }}
        >
          <div className="organizer-event__form-columns">
            <div className="organizer-event__form-col">
              <label>
                {t('organizer.formTitle')}
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                />
              </label>
              <label>
                {t('organizer.formVenue')}
                <input
                  type="text"
                  value={form.venue}
                  onChange={(e) => setForm({ ...form, venue: e.target.value })}
                  required
                />
              </label>
              <div className="organizer-event__form-row">
                <label>
                  {t('organizer.formDateTime')}
                  <input
                    type="datetime-local"
                    value={form.date}
                    min={toDatetimeLocalValue(new Date().toISOString())}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    required
                  />
                </label>
                <label>
                  {t('organizer.formPrice')}
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
            </div>
            <div className="organizer-event__form-col">
              <label>
                {t('organizer.formDescription')}
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={5}
                />
              </label>
              <label>
                {t('organizer.formImage')}
                <input
                  type="text"
                  value={form.image}
                  onChange={(e) => setForm({ ...form, image: e.target.value })}
                />
              </label>
            </div>
          </div>
          <p className="organizer-event__hint">{t('organizer.formHint')}</p>
          <div className="organizer-event__form-actions">
            <button type="submit" disabled={savingId === event.id}>
              {savingId === event.id ? t('organizer.saving') : t('organizer.save')}
            </button>
            <button type="button" onClick={onCancelEdit} className="organizer-event__cancel">
              {t('organizer.cancel')}
            </button>
          </div>
        </form>
      )}
    </li>
  )
}
