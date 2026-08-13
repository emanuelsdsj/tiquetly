// Small curated lists, not a full lookup of every Ticketmaster country
// code or TMDb genre id: enough variety for the organizer's search
// filters without pulling in a live lookup call for something that
// barely ever changes. Labels for each code live in the locale
// dictionaries (createEvent.country / createEvent.genre).
export const SHOW_COUNTRIES = [
  'BR',
  'US',
  'GB',
  'CA',
  'AR',
  'PT',
  'ES',
  'FR',
  'DE',
  'IT',
  'MX',
  'JP',
  'AU',
]

export const MOVIE_GENRES = ['28', '12', '16', '35', '18', '14', '27', '10749', '878', '53']
