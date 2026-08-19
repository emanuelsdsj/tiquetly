import { useEffect, useState } from 'react'
import { searchCatalog } from '../api/catalog'
import { translateApiError } from '../lib/apiErrors'

// Most organizer demand is domestic, so the show search starts scoped to
// Brazil rather than the whole world; switching it back to "all
// countries" is one click away (see the empty-value option in the
// consuming component).
const DEFAULT_SHOW_COUNTRY = 'BR'

export function useCatalogSearch({ token, t }) {
  const [category, setCategory] = useState('show')
  const [keyword, setKeyword] = useState('')
  const [city, setCity] = useState('')
  const [year, setYear] = useState('')
  const [country, setCountry] = useState(DEFAULT_SHOW_COUNTRY)
  const [genre, setGenre] = useState('')
  const [results, setResults] = useState(null)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState(null)

  function selectCategory(value) {
    setCategory(value)
    // A leftover keyword from the other category rarely means anything
    // there (an artist name is not a sensible movie search), so it is
    // cleared on switch rather than silently carried over and searched.
    setKeyword('')
    setCity('')
    setYear('')
    setCountry(DEFAULT_SHOW_COUNTRY)
    setGenre('')
    setSearchError(null)
  }

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearching(true)
      setSearchError(null)
      searchCatalog(category, keyword || undefined, token, {
        city: category === 'show' ? city || undefined : undefined,
        year: category === 'movie' ? year || undefined : undefined,
        country: category === 'show' ? country || undefined : undefined,
        genre: category === 'movie' ? genre || undefined : undefined,
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
  }, [category, keyword, city, year, country, genre])

  return {
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
  }
}
