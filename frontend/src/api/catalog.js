import { apiGet } from './client'

export function searchCatalog(category, keyword, token, { city, year, country, genre } = {}) {
  return apiGet('/catalog/search', { category, keyword, city, year, country, genre }, { token })
}
