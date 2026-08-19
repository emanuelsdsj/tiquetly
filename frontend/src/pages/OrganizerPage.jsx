import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { unpublishEvent, updateEvent } from '../api/events'
import { Spinner } from '../components/Spinner'
import { useAuth } from '../context/AuthContext'
import { useLocale } from '../context/LocaleContext'
import { useMyEvents } from '../hooks/useMyEvents'
import { translateApiError } from '../lib/apiErrors'
import { toDatetimeLocalValue } from '../lib/format'
import { isFutureDatetimeLocal, isNonEmptyText, isNonNegativeNumber } from '../lib/validation'
import { OrganizerEventCard } from './OrganizerEventCard'
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
  const { t, locale } = useLocale()
  const { events, setEvents, error } = useMyEvents({ user, token, t })
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(null)
  const [savingId, setSavingId] = useState(null)
  const [actionError, setActionError] = useState(null)

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
    if (!isNonEmptyText(form.title)) {
      setActionError(t('organizer.invalidTitle'))
      return
    }
    if (!isNonEmptyText(form.venue)) {
      setActionError(t('organizer.invalidVenue'))
      return
    }
    if (!isFutureDatetimeLocal(form.date)) {
      setActionError(t('organizer.invalidDate'))
      return
    }
    if (!isNonNegativeNumber(form.price)) {
      setActionError(t('organizer.invalidPrice'))
      return
    }
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
            <OrganizerEventCard
              key={event.id}
              event={event}
              editingId={editingId}
              form={form}
              setForm={setForm}
              savingId={savingId}
              onStartEdit={startEdit}
              onCancelEdit={cancelEdit}
              onSave={handleSave}
              onUnpublish={handleUnpublish}
              t={t}
              locale={locale}
            />
          ))}
        </ul>
      )}
    </main>
  )
}
