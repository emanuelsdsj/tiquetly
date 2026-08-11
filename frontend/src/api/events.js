import { apiGet } from './client'

export function searchEvents(filters = {}) {
  return apiGet('/events', filters)
}
