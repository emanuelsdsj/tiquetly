import { Spinner } from '../components/Spinner'
import { MOVIE_GENRES, SHOW_COUNTRIES } from '../lib/catalogFilters'
import { formatEventDate } from '../lib/format'

const CATEGORIES = ['show', 'movie']

export function CreateEventCatalogSearch({
  category,
  onSelectCategory,
  keyword,
  onKeywordChange,
  city,
  onCityChange,
  year,
  onYearChange,
  country,
  onCountryChange,
  genre,
  onGenreChange,
  results,
  searching,
  searchError,
  onSelectCatalogEvent,
  t,
  locale,
}) {
  return (
    <>
      <div
        className="create-event-page__categories"
        role="group"
        aria-label={t('createEvent.categoryAriaLabel')}
      >
        {CATEGORIES.map((option) => (
          <button
            key={option}
            type="button"
            className={`category-chip ${category === option ? 'category-chip--active' : ''}`}
            onClick={() => onSelectCategory(option)}
            aria-pressed={category === option}
          >
            {t(`createEvent.category.${option}`)}
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
          onChange={(e) => onKeywordChange(e.target.value)}
          aria-label={t('createEvent.searchAriaLabel')}
        />
        {category === 'show' && (
          <input
            type="text"
            className="create-event-page__search-filter create-event-page__city-field"
            placeholder={t('createEvent.cityPlaceholder')}
            value={city}
            onChange={(e) => onCityChange(e.target.value)}
            aria-label={t('createEvent.cityAriaLabel')}
            autoComplete="off"
          />
        )}
        {category === 'show' && (
          <select
            className="create-event-page__search-filter"
            value={country}
            onChange={(e) => onCountryChange(e.target.value)}
            aria-label={t('createEvent.countryAriaLabel')}
          >
            <option value="">{t('createEvent.countryAll')}</option>
            {SHOW_COUNTRIES.map((code) => (
              <option key={code} value={code}>
                {t(`createEvent.country.${code}`)}
              </option>
            ))}
          </select>
        )}
        {category === 'movie' && (
          <input
            type="number"
            inputMode="numeric"
            className="create-event-page__search-filter"
            placeholder={t('createEvent.yearPlaceholder')}
            value={year}
            onChange={(e) => onYearChange(e.target.value)}
            aria-label={t('createEvent.yearAriaLabel')}
          />
        )}
        {category === 'movie' && (
          <select
            className="create-event-page__search-filter"
            value={genre}
            onChange={(e) => onGenreChange(e.target.value)}
            aria-label={t('createEvent.genreAriaLabel')}
          >
            <option value="">{t('createEvent.genreAll')}</option>
            {MOVIE_GENRES.map((id) => (
              <option key={id} value={id}>
                {t(`createEvent.genre.${id}`)}
              </option>
            ))}
          </select>
        )}
      </div>

      {searchError && (
        <p className="create-event-page__state create-event-page__state--error">{searchError}</p>
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
                onClick={() => onSelectCatalogEvent(catalogEvent)}
              >
                {t('createEvent.select')}
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
