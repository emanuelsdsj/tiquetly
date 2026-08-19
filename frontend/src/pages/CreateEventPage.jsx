import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createEvent } from '../api/events'
import { useAuth } from '../context/AuthContext'
import { useLocale } from '../context/LocaleContext'
import { useCatalogSearch } from '../hooks/useCatalogSearch'
import { translateApiError } from '../lib/apiErrors'
import { formatEventDate, toDatetimeLocalValue } from '../lib/format'
import { CreateEventCatalogSearch } from './CreateEventCatalogSearch'
import './CreateEventPage.css'

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

  const {
    category,
    keyword,
    setKeyword,
    city,
    setCity,
    year,
    setYear,
    country,
    setCountry,
    genre,
    setGenre,
    results,
    searching,
    searchError,
    selectCategory,
  } = useCatalogSearch({ token, t })

  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  function selectCatalogEvent(catalogEvent) {
    setSelected(catalogEvent)
    setForm(emptyDetailsForm(catalogEvent))
    setSubmitError(null)
  }

  function backToSearch() {
    setSelected(null)
    setForm(null)
  }

  // Movies always sell by seat. Shows sell by quantity unless the picked
  // Ticketmaster result itself reports assigned seating (ADR 0003
  // addendum): the organizer never toggles this by hand, it follows
  // straight from what the catalog says about the specific event.
  const reservationMode = selected
    ? selected.category === 'movie' || selected.has_seatmap
      ? 'seatmap'
      : 'general'
    : null

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
      navigate('/organizer', { state: { createdEventId: created.id } })
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
          <Link to="/login">{t('common.signInLinkText')}</Link> {t('createEvent.signInPrefix')}
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
        <Link to="/organizer" className="create-event-page__back">
          {t('createEvent.back')}
        </Link>
      </header>

      {!selected && (
        <CreateEventCatalogSearch
          category={category}
          onSelectCategory={selectCategory}
          keyword={keyword}
          onKeywordChange={setKeyword}
          city={city}
          onCityChange={setCity}
          year={year}
          onYearChange={setYear}
          country={country}
          onCountryChange={setCountry}
          genre={genre}
          onGenreChange={setGenre}
          results={results}
          searching={searching}
          searchError={searchError}
          onSelectCatalogEvent={selectCatalogEvent}
          t={t}
          locale={locale}
        />
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
