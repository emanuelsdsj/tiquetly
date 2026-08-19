// Card payment fields (PaymentForm). isExpiryValid stays in inputMasks.js
// alongside the masking functions it pairs with; these three cover the
// fields that had no validation at all before, only native HTML
// attributes.

// maskCardNumber always produces "dddd dddd dddd dddd" once complete (16
// digits, space-grouped); this just confirms all 16 digits landed. The
// two literal test-card strings the payment simulation recognizes (ADR
// 0010) are already in this exact format, so they pass unchanged.
export function isValidCardNumber(value) {
  return /^\d{4} \d{4} \d{4} \d{4}$/.test(value)
}

// Native `required` doesn't catch whitespace-only input.
export function isValidCardHolder(value) {
  return value.trim().length > 0
}

// maskDigits(value, 3) already caps length while typing; this rejects a
// short or empty value at submit time.
export function isValidCvv(value) {
  return /^\d{3}$/.test(value)
}

// Generic field checks shared by CreateEventPage's details form and
// OrganizerPage's edit form, which both build event records with the
// same shape of venue/price/date fields.

export function isNonEmptyText(value) {
  return value.trim().length > 0
}

export function isPositiveInteger(value) {
  const n = Number(value)
  return Number.isInteger(n) && n >= 1
}

export function isNonNegativeNumber(value) {
  const n = Number(value)
  return Number.isFinite(n) && n >= 0
}

// value is the "YYYY-MM-DDTHH:mm" string a datetime-local input produces
// (the same shape lib/format.js's toDatetimeLocalValue emits). Both forms
// already set a `min` attribute to steer the picker away from past dates,
// but that is a UI nudge, not a guarantee (a value can still arrive
// already in the past, e.g. left over from before `min` was added, or the
// picker's native fallback on an older browser); this is the actual check,
// with a translated inline message instead of only the browser's native,
// untranslated tooltip.
export function isFutureDatetimeLocal(value, now = new Date()) {
  const date = new Date(value)
  return !Number.isNaN(date.getTime()) && date > now
}
