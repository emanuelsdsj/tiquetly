import { useEffect, useState } from 'react'
import { searchEvents } from '../api/events'
import { EventCard } from '../components/EventCard'
import './BrowsePage.css'

const CATEGORIES = [
  { value: '', label: 'Todos' },
  { value: 'show', label: 'Shows' },
  { value: 'movie', label: 'Filmes' },
]

export function BrowsePage() {
  const [q, setQ] = useState('')
  const [category, setCategory] = useState('')
  const [priceMax, setPriceMax] = useState('')
  const [events, setEvents] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    const timeout = setTimeout(() => {
      setError(null)
      searchEvents({ q, category, price_max: priceMax })
        .then(setEvents)
        .catch((err) => setError(err.message))
    }, 300)
    return () => clearTimeout(timeout)
  }, [q, category, priceMax])

  return (
    <main className="browse-page">
      <header className="browse-page__head">
        <h1 className="browse-page__title">Tiquetly</h1>
        <p className="browse-page__subtitle">Shows e filmes com ingresso disponível agora.</p>
      </header>

      <div className="browse-page__filters">
        <input
          className="browse-page__search"
          type="search"
          placeholder="Buscar por nome do evento"
          value={q}
          onChange={(event) => setQ(event.target.value)}
          aria-label="Buscar evento"
        />
        <div className="browse-page__categories" role="group" aria-label="Filtrar por categoria">
          {CATEGORIES.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`category-chip ${category === option.value ? 'category-chip--active' : ''}`}
              onClick={() => setCategory(option.value)}
              aria-pressed={category === option.value}
            >
              {option.label}
            </button>
          ))}
        </div>
        <label className="browse-page__price">
          Até
          <input
            type="number"
            min="0"
            placeholder="Sem limite"
            value={priceMax}
            onChange={(event) => setPriceMax(event.target.value)}
          />
        </label>
      </div>

      {error && <p className="browse-page__state browse-page__state--error">{error}</p>}

      {!error && events === null && <p className="browse-page__state">Carregando eventos...</p>}

      {!error && events !== null && events.length === 0 && (
        <p className="browse-page__state">
          Nenhum evento encontrado com esses filtros. Tente ajustar a busca.
        </p>
      )}

      {!error && events !== null && events.length > 0 && (
        <div className="browse-page__grid">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </main>
  )
}
