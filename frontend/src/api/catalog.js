import { apiGet } from './client'

export function searchCatalog(category, keyword, token, { city, year } = {}) {
  return apiGet('/catalog/search', { category, keyword, city, year }, { token })
}
