import { describe, expect, it } from 'vitest'
import { formatEventDate, formatPrice } from './format'

// Date formatting depends on the runner's local timezone; pin it so this
// test is deterministic regardless of where it runs (CI or locally).
process.env.TZ = 'UTC'

// formatPrice inserts a non-breaking space (U+00A0, not a regular
// space) between "R$" and the number, the same in both locales (see
// the comment on formatPrice itself: en's own Intl currency
// formatting renders no space at all, which used to make the price
// visibly jump on locale toggle).
const NBSP = ' '

describe('formatPrice', () => {
  it('always renders BRL currency regardless of locale, with the same spacing', () => {
    expect(formatPrice(32, 'en')).toBe(`R$${NBSP}32.00`)
    expect(formatPrice(32, 'pt-BR')).toBe(`R$${NBSP}32,00`)
  })

  it('defaults to pt-BR when no locale is passed', () => {
    expect(formatPrice(32)).toBe(formatPrice(32, 'pt-BR'))
  })

  it('formats zero and large values', () => {
    expect(formatPrice(0, 'en')).toBe(`R$${NBSP}0.00`)
    expect(formatPrice(1234.5, 'en')).toBe(`R$${NBSP}1,234.50`)
    expect(formatPrice(1234.5, 'pt-BR')).toBe(`R$${NBSP}1.234,50`)
  })
})

describe('formatEventDate', () => {
  const isoString = '2026-08-12T12:00:00Z'

  it('formats the date and time for each locale', () => {
    expect(formatEventDate(isoString, 'en')).toBe('Aug 12 · 12:00 PM')
    expect(formatEventDate(isoString, 'pt-BR')).toBe('12 de ago. · 12:00')
  })

  it('defaults to pt-BR when no locale is passed', () => {
    expect(formatEventDate(isoString)).toBe(formatEventDate(isoString, 'pt-BR'))
  })
})
