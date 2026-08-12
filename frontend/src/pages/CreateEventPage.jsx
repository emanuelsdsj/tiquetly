import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { searchCatalog } from '../api/catalog'
import { createEvent } from '../api/events'
import { useAuth } from '../context/AuthContext'
import { formatEventDate, toDatetimeLocalValue } from '../lib/format'
import './CreateEventPage.css'

const CATEGORIES = [
  { value: 'show', label: 'Show', reservationMode: 'general' },
  { value: 'movie', label: 'Filme', reservationMode: 'seatmap' },
]

const RESERVATION_MODE_LABEL = {
  general: 'Por quantidade (pista/setor)',
  seatmap: 'Mapa de assentos',
}

function emptyDetailsForm(catalogEvent) {
  return {
    date: catalogEvent.date ? toDatetimeLocalValue(catalogEvent.date) : '',
    venue: catalogEvent.venue || '',
    capacity: '',
    price: '',
  }
}

export function CreateEventPage() {
  const { token, user } = useAuth()
  const navigate = useNavigate()

  const [category, setCategory] = useState('show')
  const [keyword, setKeyword] = useState('')
  const [results, setResults] = useState(null)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState(null)

  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  function selectCategory(value) {
    setCategory(value)
    setResults(null)
    setSearchError(null)
  }

  async function handleSearch(formEvent) {
    formEvent.preventDefault()
    setSearching(true)
    setSearchError(null)
    try {
      const catalogEvents = await searchCatalog(category, keyword || undefined, token)
      setResults(catalogEvents)
    } catch (err) {
      setSearchError(err.message)
    } finally {
      setSearching(false)
    }
  }

  function selectCatalogEvent(catalogEvent) {
    setSelected(catalogEvent)
    setForm(emptyDetailsForm(catalogEvent))
    setSubmitError(null)
  }

  function backToSearch() {
    setSelected(null)
    setForm(null)
  }

  const reservationMode = CATEGORIES.find((c) => c.value === category).reservationMode

  async function handleSubmit(formEvent) {
    formEvent.preventDefault()
    setSubmitting(true)
    setSubmitError(null)
    try {
      const created = await createEvent(
        {
          source: selected.source,
          external_id: selected.external_id,
          title: selected.title,
          image: selected.image || null,
          description: selected.description || null,
          category: selected.category,
          date: new Date(form.date).toISOString(),
          venue: form.venue,
          capacity: Number(form.capacity),
          price: Number(form.price),
          reservation_mode: reservationMode,
        },
        token,
      )
      navigate('/organizador', { state: { createdEventId: created.id } })
    } catch (err) {
      setSubmitError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (!user) {
    return (
      <main className="create-event-page">
        <p className="create-event-page__state">
          <Link to="/entrar">Entre</Link> com uma conta de organizador.
        </p>
      </main>
    )
  }

  if (user.role !== 'organizer') {
    return (
      <main className="create-event-page">
        <p className="create-event-page__state">Esta área é restrita aos organizadores.</p>
      </main>
    )
  }

  return (
    <main className="create-event-page">
      <header className="create-event-page__head">
        <div>
          <h1 className="create-event-page__title">Criar evento</h1>
          <p className="create-event-page__subtitle">
            Escolha um show ou filme do catálogo e defina os detalhes.
          </p>
        </div>
        <Link to="/organizador" className="create-event-page__back">
          Voltar
        </Link>
      </header>

      {!selected && (
        <>
          <div
            className="create-event-page__categories"
            role="group"
            aria-label="Categoria do evento"
          >
            {CATEGORIES.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`category-chip ${category === option.value ? 'category-chip--active' : ''}`}
                onClick={() => selectCategory(option.value)}
                aria-pressed={category === option.value}
              >
                {option.label}
              </button>
            ))}
          </div>

          <form className="create-event-page__search" onSubmit={handleSearch}>
            <input
              type="search"
              placeholder={category === 'show' ? 'Buscar artista ou show' : 'Buscar filme'}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              aria-label="Buscar no catálogo"
            />
            <button type="submit" disabled={searching}>
              {searching ? 'Buscando...' : 'Buscar'}
            </button>
          </form>

          {searchError && (
            <p className="create-event-page__state create-event-page__state--error">
              {searchError}
            </p>
          )}

          {!searchError && results !== null && results.length === 0 && (
            <p className="create-event-page__state">Nada encontrado. Tente outra palavra-chave.</p>
          )}

          {!searchError && results !== null && results.length > 0 && (
            <ul className="create-event-page__results">
              {results.map((catalogEvent) => (
                <li key={catalogEvent.external_id} className="catalog-result">
                  {catalogEvent.image && (
                    <img
                      className="catalog-result__image"
                      src={catalogEvent.image}
                      alt=""
                      aria-hidden="true"
                    />
                  )}
                  <div className="catalog-result__info">
                    <h3 className="catalog-result__title">{catalogEvent.title}</h3>
                    <p className="catalog-result__meta">
                      {[
                        catalogEvent.venue,
                        catalogEvent.date ? formatEventDate(catalogEvent.date) : null,
                      ]
                        .filter(Boolean)
                        .join(' · ') || 'Sem data ou local no catálogo'}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="catalog-result__select"
                    onClick={() => selectCatalogEvent(catalogEvent)}
                  >
                    Selecionar
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {selected && form && (
        <>
          <div className="catalog-result catalog-result--picked">
            {selected.image && (
              <img
                className="catalog-result__image"
                src={selected.image}
                alt=""
                aria-hidden="true"
              />
            )}
            <div className="catalog-result__info">
              <h3 className="catalog-result__title">{selected.title}</h3>
              <p className="catalog-result__meta">
                {CATEGORIES.find((c) => c.value === selected.category).label}
              </p>
            </div>
            <button type="button" className="catalog-result__select" onClick={backToSearch}>
              Trocar
            </button>
          </div>

          <form className="create-event-page__details" onSubmit={handleSubmit}>
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
              Local
              <input
                type="text"
                value={form.venue}
                onChange={(e) => setForm({ ...form, venue: e.target.value })}
                required
              />
            </label>
            <div className="create-event-page__details-row">
              <label>
                Capacidade
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
            <p className="create-event-page__hint">
              Modo de reserva: {RESERVATION_MODE_LABEL[reservationMode]}. Definido pela categoria,
              não pode ser alterado depois.
            </p>

            {submitError && (
              <p className="create-event-page__state create-event-page__state--error">
                {submitError}
              </p>
            )}

            <button type="submit" className="create-event-page__publish" disabled={submitting}>
              {submitting ? 'Publicando...' : 'Publicar evento'}
            </button>
          </form>
        </>
      )}
    </main>
  )
}
