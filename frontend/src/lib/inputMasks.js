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
