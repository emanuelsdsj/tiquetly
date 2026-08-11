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
