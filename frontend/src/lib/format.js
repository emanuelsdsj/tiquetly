export function formatEventDate(isoString, locale = 'pt-BR') {
  const date = new Date(isoString)
  const datePart = new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short' }).format(date)
  const timePart = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(
    date,
  )
  return `${datePart} · ${timePart}`
}

// Always BRL: Tiquetly sells in reais regardless of the UI language, and
// the number itself is always formatted the Brazilian way (comma as the
// decimal separator, period for thousands) too, not just the currency:
// a price is a fact about the product, not UI copy, so it does not
// switch with the interface language any more than the item's price tag
// would. `locale` is accepted for a uniform signature with
// `formatEventDate` but intentionally unused here. The "R$" prefix is
// built by hand rather than left to Intl's own currency formatting:
// en's ICU data renders the symbol flush against the number with no
// space at all, while pt-BR puts a space in between, which would make
// the price visibly shift if the separator ever did follow the locale.
// A non-breaking space keeps "R$" and the number from wrapping onto
// separate lines in a narrow ticket card.
// eslint-disable-next-line no-unused-vars -- kept for a uniform signature with formatEventDate
export function formatPrice(value, locale = 'pt-BR') {
  const amount = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
  return `R$\u00a0${amount}`
}

export function toDatetimeLocalValue(isoString) {
  const date = new Date(isoString)
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}
