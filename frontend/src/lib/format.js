export function formatEventDate(isoString) {
  const date = new Date(isoString)
  const datePart = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(date)
  const timePart = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(
    date,
  )
  return `${datePart} · ${timePart}`
}

export function formatPrice(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

export function toDatetimeLocalValue(isoString) {
  const date = new Date(isoString)
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}
