import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { searchCatalog } from '../api/catalog'
import { createEvent } from '../api/events'
import { Spinner } from '../components/Spinner'
import { useAuth } from '../context/AuthContext'
import { useLocale } from '../context/LocaleContext'
import { translateApiError } from '../lib/apiErrors'
import { formatEventDate, toDatetimeLocalValue } from '../lib/format'
import './CreateEventPage.css'

const CATEGORIES = [
  { value: 'show', reservationMode: 'general' },
  { value: 'movie', reservationMode: 'seatmap' },
]

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
  const { t, locale } = useLocale()
  const navigate = useNavigate()

  const [category, setCategory] = useState('show')
  const [keyword, setKeyword] = useState('')
  const [city, setCity] = useState('')
  const [year, setYear] = useState('')
  const [results, setResults] = useState(null)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState(null)

  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  function selectCategory(value) {
    setCategory(value)
    // A leftover keyword from the other category rarely means anything
    // there (an artist name is not a sensible movie search), so it is
    // cleared on switch rather than silently carried over and searched.
    setKeyword('')
    setCity('')
    setYear('')
    setSearchError(null)
  }

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearching(true)
      setSearchError(null)
      searchCatalog(category, keyword || undefined, token, {
        city: category === 'show' ? city || undefined : undefined,
        year: category === 'movie' ? year || undefined : undefined,
      })
        .then(setResults)
        .catch((err) => setSearchError(translateApiError(err, t)))
        .finally(() => setSearching(false))
      // Empty keyword still searches (the catalog's own default listing,
      // e.g. TMDb's "now playing"), so there is always something to pick
      // from without the organizer having to type anything first.
    }, 300)
    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, keyword, city, year])

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
      setSubmitError(translateApiError(err, t))
    } finally {
      setSubmitting(false)
    }
  }

  if (!user) {
    return (
      <main className="create-event-page">
        <p className="create-event-page__state">
          <Link to="/entrar">{t('common.signInLinkText')}</Link> {t('createEvent.signInPrefix')}
        </p>
      </main>
    )
  }

  if (user.role !== 'organizer') {
    return (
      <main className="create-event-page">
        <p className="create-event-page__state">{t('createEvent.restricted')}</p>
      </main>
    )
  }

  return (
    <main className="create-event-page">
      <header className="create-event-page__head">
        <div>
          <h1 className="create-event-page__title">{t('createEvent.title')}</h1>
          <p className="create-event-page__subtitle">{t('createEvent.subtitle')}</p>
        </div>
        <Link to="/organizador" className="create-event-page__back">
          {t('createEvent.back')}
        </Link>
      </header>

      {!selected && (
        <>
          <div
            className="create-event-page__categories"
            role="group"
            aria-label={t('createEvent.categoryAriaLabel')}
          >
            {CATEGORIES.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`category-chip ${category === option.value ? 'category-chip--active' : ''}`}
                onClick={() => selectCategory(option.value)}
                aria-pressed={category === option.value}
              >
                {t(`createEvent.category.${option.value}`)}
              </button>
            ))}
          </div>

          <div className="create-event-page__search">
            <input
              type="search"
              placeholder={
                category === 'show'
                  ? t('createEvent.searchArtistPlaceholder')
                  : t('createEvent.searchMoviePlaceholder')
              }
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              aria-label={t('createEvent.searchAriaLabel')}
            />
            {category === 'show' && (
              <input
                type="text"
                className="create-event-page__search-filter create-event-page__city-field"
                placeholder={t('createEvent.cityPlaceholder')}
                value={city}
                onChange={(e) => setCity(e.target.value)}
                aria-label={t('createEvent.cityAriaLabel')}
                autoComplete="off"
              />
            )}
            {category === 'movie' && (
              <input
                type="number"
                inputMode="numeric"
                className="create-event-page__search-filter"
                placeholder={t('createEvent.yearPlaceholder')}
                value={year}
                onChange={(e) => setYear(e.target.value)}
                aria-label={t('createEvent.yearAriaLabel')}
              />
            )}
          </div>

          {searchError && (
            <p className="create-event-page__state create-event-page__state--error">
              {searchError}
            </p>
          )}

          {!searchError && searching && results === null && (
            <p className="create-event-page__state">
              <Spinner />
              {t('createEvent.searching')}
            </p>
          )}

          {!searchError && results !== null && results.length === 0 && (
            <p className="create-event-page__state">{t('createEvent.notFound')}</p>
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
                        catalogEvent.date ? formatEventDate(catalogEvent.date, locale) : null,
                      ]
                        .filter(Boolean)
                        .join(' · ') || t('createEvent.noDateOrVenue')}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="catalog-result__select"
                    onClick={() => selectCatalogEvent(catalogEvent)}
                  >
                    {t('createEvent.select')}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {selected && form && (
        <div className="create-event-page__layout">
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
                {[
                  t(`createEvent.category.${selected.category}`),
                  selected.venue,
                  selected.date ? formatEventDate(selected.date, locale) : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>
            <button type="button" className="catalog-result__select" onClick={backToSearch}>
              {t('createEvent.change')}
            </button>
          </div>

          <form className="create-event-page__details" onSubmit={handleSubmit}>
            <label>
              {t('createEvent.formDateTime')}
              <input
                type="datetime-local"
                value={form.date}
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
              <p className="create-event-page__state create-event-page__state--error">
                {submitError}
              </p>
            )}

            <button type="submit" className="create-event-page__publish" disabled={submitting}>
              {submitting ? t('createEvent.publishing') : t('createEvent.publish')}
            </button>
          </form>
        </div>
      )}
    </main>
  )
}
