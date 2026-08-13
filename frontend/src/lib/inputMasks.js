export function maskDigits(value, maxDigits) {
  return value.replace(/\D/g, '').slice(0, maxDigits)
}

// "4242424242424242" -> "4242 4242 4242 4242", trimming a trailing space
// left over from a partial group while still typing.
export function maskCardNumber(value) {
  return maskDigits(value, 16)
    .replace(/(\d{4})/g, '$1 ')
    .trim()
}

// "0102" -> "01/02" as it's typed, not just validated after the fact.
export function maskExpiry(value) {
  const digits = maskDigits(value, 4)
  if (digits.length <= 2) return digits
  return `${digits.slice(0, 2)}/${digits.slice(2)}`
}

// Expects the "MM/YY" shape maskExpiry produces. Checks the month is a
// real month (01-12) and the card has not already expired, same as a real
// payment form would before ever sending the card to the network; ADR
// 0010's "no expiry validation" note was about the simulated approval
// itself (only the card number picks the outcome), not the form input.
export function isExpiryValid(value, now = new Date()) {
  const match = /^(\d{2})\/(\d{2})$/.exec(value)
  if (!match) return false
  const month = Number(match[1])
  if (month < 1 || month > 12) return false
  const year = 2000 + Number(match[2])
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1
  if (year < currentYear) return false
  if (year === currentYear && month < currentMonth) return false
  return true
}
