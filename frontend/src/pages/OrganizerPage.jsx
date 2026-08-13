import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { getMyEvents, unpublishEvent, updateEvent } from '../api/events'
import { Spinner } from '../components/Spinner'
import { useAuth } from '../context/AuthContext'
import { useLocale } from '../context/LocaleContext'
import { translateApiError } from '../lib/apiErrors'
import { formatEventDate, formatPrice, toDatetimeLocalValue } from '../lib/format'
import './OrganizerPage.css'

function emptyForm(event) {
  return {
    title: event.title,
    description: event.description || '',
    image: event.image || '',
    venue: event.venue,
    price: event.price,
    date: toDatetimeLocalValue(event.date),
  }
}

export function OrganizerPage() {
  const { token, user } = useAuth()
  const location = useLocation()
  const justCreated = Boolean(location.state?.createdEventId)
  const [events, setEvents] = useState(null)
  const [error, setError] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(null)
  const [savingId, setSavingId] = useState(null)
  const [actionError, setActionError] = useState(null)
  const { t, locale } = useLocale()

  useEffect(() => {
    if (user?.role !== 'organizer') return
    getMyEvents(token)
      .then(setEvents)
      .catch((err) => setError(translateApiError(err, t)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, token])

  function startEdit(event) {
    setEditingId(event.id)
    setForm(emptyForm(event))
    setActionError(null)
  }

  function cancelEdit() {
    setEditingId(null)
    setForm(null)
  }

  async function handleSave(eventId) {
    setSavingId(eventId)
    setActionError(null)
    try {
      const updated = await updateEvent(
        eventId,
        {
          title: form.title,
          description: form.description || null,
          image: form.image || null,
          venue: form.venue,
          price: Number(form.price),
          date: new Date(form.date).toISOString(),
        },
        token,
      )
      setEvents((current) => current.map((event) => (event.id === eventId ? updated : event)))
      cancelEdit()
    } catch (err) {
      setActionError(translateApiError(err, t))
    } finally {
      setSavingId(null)
    }
  }

  async function handleUnpublish(event) {
    if (!window.confirm(t('organizer.confirmUnpublish', { title: event.title }))) return
    setSavingId(event.id)
    setActionError(null)
    try {
      const updated = await unpublishEvent(event.id, token)
      setEvents((current) => current.map((e) => (e.id === event.id ? updated : e)))
    } catch (err) {
      setActionError(translateApiError(err, t))
    } finally {
      setSavingId(null)
    }
  }

  if (!user) {
    return (
      <main className="organizer-page">
        <p className="organizer-page__state">
          <Link to="/login">{t('common.signInLinkText')}</Link> {t('organizer.signInPrefix')}
        </p>
      </main>
    )
  }

  if (user.role !== 'organizer') {
    return (
      <main className="organizer-page">
        <p className="organizer-page__state">{t('organizer.restricted')}</p>
      </main>
    )
  }

  return (
    <main className="organizer-page">
      <header className="organizer-page__head">
        <div>
          <h1 className="organizer-page__title">{t('organizer.title')}</h1>
          <p className="organizer-page__subtitle">{t('organizer.subtitle')}</p>
        </div>
        <Link to="/organizer/create" className="organizer-page__create">
          {t('organizer.createEvent')}
        </Link>
      </header>

      {justCreated && (
        <p className="organizer-page__state organizer-page__state--success">
          {t('organizer.published')}
        </p>
      )}

      {error && <p className="organizer-page__state organizer-page__state--error">{error}</p>}
      {actionError && (
        <p className="organizer-page__state organizer-page__state--error">{actionError}</p>
      )}

      {!error && events === null && (
        <p className="organizer-page__state">
          <Spinner />
          {t('organizer.loading')}
        </p>
      )}

      {events !== null && events.length === 0 && (
        <p className="organizer-page__state">{t('organizer.empty')}</p>
      )}

      {events !== null && events.length > 0 && (
        <ul className="organizer-page__list">
          {events.map((event) => (
            <li key={event.id} className="organizer-event">
              <div className="organizer-event__row">
                <div className="organizer-event__info">
                  <span className={`organizer-event__tag organizer-event__tag--${event.category}`}>
                    {t(`organizer.category.${event.category}`)}
                  </span>
                  <span
                    className={`organizer-event__status organizer-event__status--${event.status}`}
                  >
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
                  <button
                    type="button"
                    onClick={() => startEdit(event)}
                    disabled={savingId === event.id}
                  >
                    {t('organizer.edit')}
                  </button>
                  {event.status === 'published' && (
                    <button
                      type="button"
                      className="organizer-event__unpublish"
                      onClick={() => handleUnpublish(event)}
                      disabled={savingId === event.id}
                    >
                      {savingId === event.id
                        ? t('organizer.unpublishing')
                        : t('organizer.unpublish')}
                    </button>
                  )}
                </div>
              </div>

              {editingId === event.id && (
                <form
                  className="organizer-event__form"
                  onSubmit={(formEvent) => {
                    formEvent.preventDefault()
                    handleSave(event.id)
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
                    <button type="button" onClick={cancelEdit} className="organizer-event__cancel">
                      {t('organizer.cancel')}
                    </button>
                  </div>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
