import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createEvent } from '../api/events'
import { useAuth } from '../context/AuthContext'
import { useLocale } from '../context/LocaleContext'
import { useCatalogSearch } from '../hooks/useCatalogSearch'
import { translateApiError } from '../lib/apiErrors'
import { toDatetimeLocalValue } from '../lib/format'
import {
  isFutureDatetimeLocal,
  isNonEmptyText,
  isNonNegativeNumber,
  isPositiveInteger,
} from '../lib/validation'
import { CreateEventCatalogSearch } from './CreateEventCatalogSearch'
import { CreateEventDetailsForm } from './CreateEventDetailsForm'
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
    if (!isFutureDatetimeLocal(form.date)) {
      setSubmitError(t('createEvent.invalidDate'))
      return
    }
    if (!isNonEmptyText(form.venue)) {
      setSubmitError(t('createEvent.invalidVenue'))
      return
    }
    if (!isPositiveInteger(form.capacity)) {
      setSubmitError(t('createEvent.invalidCapacity'))
      return
    }
    if (!isNonNegativeNumber(form.price)) {
      setSubmitError(t('createEvent.invalidPrice'))
      return
    }
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
        <CreateEventDetailsForm
          selected={selected}
          form={form}
          setForm={setForm}
          reservationMode={reservationMode}
          submitting={submitting}
          submitError={submitError}
          onSubmit={handleSubmit}
          onBackToSearch={backToSearch}
          t={t}
          locale={locale}
        />
      )}
    </main>
  )
}
