import { describe, expect, it } from 'vitest'
import { formatEventDate, formatPrice } from './format'

// Date formatting depends on the runner's local timezone; pin it so this
// test is deterministic regardless of where it runs (CI or locally).
process.env.TZ = 'UTC'

// pt-BR's Intl currency format puts a non-breaking space (U+00A0, not a
// regular space) between the "R$" symbol and the number.
const NBSP = ' '

describe('formatPrice', () => {
  it('always renders BRL currency regardless of locale', () => {
    expect(formatPrice(32, 'en')).toBe('R$32.00')
    expect(formatPrice(32, 'pt-BR')).toBe(`R$${NBSP}32,00`)
  })

  it('defaults to pt-BR when no locale is passed', () => {
    expect(formatPrice(32)).toBe(formatPrice(32, 'pt-BR'))
  })

  it('formats zero and large values', () => {
    expect(formatPrice(0, 'en')).toBe('R$0.00')
    expect(formatPrice(1234.5, 'en')).toBe('R$1,234.50')
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
