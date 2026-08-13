const LOCALE_KEY = 'tiquetly_locale'

export function getStoredLocale() {
  return localStorage.getItem(LOCALE_KEY)
}

export function setStoredLocale(locale) {
  localStorage.setItem(LOCALE_KEY, locale)
}
