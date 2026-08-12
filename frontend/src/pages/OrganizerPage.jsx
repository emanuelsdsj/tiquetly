import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { getMyEvents, unpublishEvent, updateEvent } from '../api/events'
import { useAuth } from '../context/AuthContext'
import { formatEventDate, formatPrice, toDatetimeLocalValue } from '../lib/format'
import './OrganizerPage.css'

const CATEGORY_LABEL = { show: 'Show', movie: 'Filme' }
const STATUS_LABEL = { published: 'Publicado', cancelled: 'Despublicado', draft: 'Rascunho' }

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

  useEffect(() => {
    if (user?.role !== 'organizer') return
    getMyEvents(token)
      .then(setEvents)
      .catch((err) => setError(err.message))
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
      setActionError(err.message)
    } finally {
      setSavingId(null)
    }
  }

  async function handleUnpublish(event) {
    if (!window.confirm(`Despublicar "${event.title}"? O evento sai da busca imediatamente.`))
      return
    setSavingId(event.id)
    setActionError(null)
    try {
      const updated = await unpublishEvent(event.id, token)
      setEvents((current) => current.map((e) => (e.id === event.id ? updated : e)))
    } catch (err) {
      setActionError(err.message)
    } finally {
      setSavingId(null)
    }
  }

  if (!user) {
    return (
      <main className="organizer-page">
        <p className="organizer-page__state">
          <Link to="/entrar">Entre</Link> com uma conta de organizador.
        </p>
      </main>
    )
  }

  if (user.role !== 'organizer') {
    return (
      <main className="organizer-page">
        <p className="organizer-page__state">Esta área é restrita aos organizadores.</p>
      </main>
    )
  }

  return (
    <main className="organizer-page">
      <header className="organizer-page__head">
        <div>
          <h1 className="organizer-page__title">Meus eventos</h1>
          <p className="organizer-page__subtitle">Gerencie os eventos que você publicou.</p>
        </div>
        <Link to="/organizador/criar" className="organizer-page__create">
          Criar evento
        </Link>
      </header>

      {justCreated && (
        <p className="organizer-page__state organizer-page__state--success">Evento publicado.</p>
      )}

      {error && <p className="organizer-page__state organizer-page__state--error">{error}</p>}
      {actionError && (
        <p className="organizer-page__state organizer-page__state--error">{actionError}</p>
      )}

      {!error && events === null && <p className="organizer-page__state">Carregando eventos...</p>}

      {events !== null && events.length === 0 && (
        <p className="organizer-page__state">Você ainda não publicou nenhum evento.</p>
      )}

      {events !== null && events.length > 0 && (
        <ul className="organizer-page__list">
          {events.map((event) => (
            <li key={event.id} className="organizer-event">
              <div className="organizer-event__row">
                <div className="organizer-event__info">
                  <span className={`organizer-event__tag organizer-event__tag--${event.category}`}>
                    {CATEGORY_LABEL[event.category]}
                  </span>
                  <span
                    className={`organizer-event__status organizer-event__status--${event.status}`}
                  >
                    {STATUS_LABEL[event.status]}
                  </span>
                  <h2 className="organizer-event__title">{event.title}</h2>
                  <p className="organizer-event__meta">
                    {event.venue} · {formatEventDate(event.date)} · {formatPrice(event.price)}
                  </p>
                  <p className="organizer-event__meta">
                    {event.reserved_count}/{event.capacity} reservados
                  </p>
                </div>
                <div className="organizer-event__actions">
                  <button
                    type="button"
                    onClick={() => startEdit(event)}
                    disabled={savingId === event.id}
                  >
                    Editar
                  </button>
                  {event.status === 'published' && (
                    <button
                      type="button"
                      className="organizer-event__unpublish"
                      onClick={() => handleUnpublish(event)}
                      disabled={savingId === event.id}
                    >
                      {savingId === event.id ? 'Despublicando...' : 'Despublicar'}
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
                  <label>
                    Título
                    <input
                      type="text"
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      required
                    />
                  </label>
                  <label>
                    Descrição
                    <textarea
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      rows={3}
                    />
                  </label>
                  <label>
                    Imagem (URL)
                    <input
                      type="text"
                      value={form.image}
                      onChange={(e) => setForm({ ...form, image: e.target.value })}
                    />
                  </label>
                  <label>
                    Local
                    <input
                      type="text"
                      value={form.venue}
                      onChange={(e) => setForm({ ...form, venue: e.target.value })}
                      required
                    />
                  </label>
                  <div className="organizer-event__form-row">
                    <label>
                      Data e hora
                      <input
                        type="datetime-local"
                        value={form.date}
                        onChange={(e) => setForm({ ...form, date: e.target.value })}
                        required
                      />
                    </label>
                    <label>
                      Preço
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
                  <p className="organizer-event__hint">
                    Capacidade e categoria não podem ser alteradas depois da publicação.
                  </p>
                  <div className="organizer-event__form-actions">
                    <button type="submit" disabled={savingId === event.id}>
                      {savingId === event.id ? 'Salvando...' : 'Salvar'}
                    </button>
                    <button type="button" onClick={cancelEdit} className="organizer-event__cancel">
                      Cancelar
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
