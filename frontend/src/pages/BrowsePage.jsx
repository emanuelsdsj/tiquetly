import { useEffect, useState } from 'react'
import { searchEvents } from '../api/events'
import { EventCard } from '../components/EventCard'
import { FeaturedCarousel } from '../components/FeaturedCarousel'
import { Spinner } from '../components/Spinner'
import { useLocale } from '../context/LocaleContext'
import { translateApiError } from '../lib/apiErrors'
import './BrowsePage.css'

export function BrowsePage() {
  const { t } = useLocale()
  const [q, setQ] = useState('')
  const [category, setCategory] = useState('')
  const [priceMax, setPriceMax] = useState('')
  const [events, setEvents] = useState(null)
  const [error, setError] = useState(null)
  const isFiltering = q !== '' || category !== '' || priceMax !== ''

  const categories = [
    { value: '', label: t('browse.categoryAll') },
    { value: 'show', label: t('common.category.show') },
    { value: 'movie', label: t('common.category.movie') },
  ]

  useEffect(() => {
    const timeout = setTimeout(() => {
      setError(null)
      searchEvents({ q, category, price_max: priceMax })
        .then(setEvents)
        .catch((err) => setError(translateApiError(err, t)))
    }, 300)
    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, category, priceMax])

  return (
    <main className="browse-page">
      <header className="browse-page__head">
        <h1 className="browse-page__title">{t('browse.title')}</h1>
        <p className="browse-page__subtitle">{t('browse.subtitle')}</p>
      </header>

      <div className="browse-page__filters">
        <input
          className="browse-page__search"
          type="search"
          placeholder={t('browse.searchPlaceholder')}
          value={q}
          onChange={(event) => setQ(event.target.value)}
          aria-label={t('browse.searchAriaLabel')}
        />
        <div
          className="browse-page__categories"
          role="group"
          aria-label={t('browse.categoryGroupAriaLabel')}
        >
          {categories.map((option) => (
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
          {t('browse.priceUpTo')}
          <input
            type="number"
            min="0"
            placeholder={t('browse.priceNoLimit')}
            value={priceMax}
            onChange={(event) => setPriceMax(event.target.value)}
          />
        </label>
      </div>

      {error && <p className="browse-page__state browse-page__state--error">{error}</p>}

      {!error && events === null && (
        <p className="browse-page__state">
          <Spinner />
          {t('browse.loading')}
        </p>
      )}

      {!error && events !== null && events.length === 0 && (
        <p className="browse-page__state">{t('browse.empty')}</p>
      )}

      {!error && events !== null && events.length > 0 && !isFiltering && (
        <FeaturedCarousel events={events} />
      )}

      {!error && events !== null && events.length > 0 && isFiltering && (
        <div className="browse-page__grid">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </main>
  )
}
