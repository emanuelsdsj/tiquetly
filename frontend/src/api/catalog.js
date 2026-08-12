import { apiGet } from './client'

export function searchCatalog(category, keyword, token) {
  return apiGet('/catalog/search', { category, keyword }, { token })
}
