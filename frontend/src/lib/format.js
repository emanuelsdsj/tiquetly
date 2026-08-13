export function formatEventDate(isoString, locale = 'pt-BR') {
  const date = new Date(isoString)
  const datePart = new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short' }).format(date)
  const timePart = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(
    date,
  )
  return `${datePart} · ${timePart}`
}

// Always BRL: Tiquetly sells in reais regardless of the UI language, only
// the decimal/thousands separator style follows the locale.
export function formatPrice(value, locale = 'pt-BR') {
  return new Intl.NumberFormat(locale, { style: 'currency', currency: 'BRL' }).format(value)
}

export function toDatetimeLocalValue(isoString) {
  const date = new Date(isoString)
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}
