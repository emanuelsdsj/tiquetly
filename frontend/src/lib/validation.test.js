import { describe, expect, it } from 'vitest'
import {
  isFutureDatetimeLocal,
  isNonEmptyText,
  isNonNegativeNumber,
  isPositiveInteger,
  isValidCardHolder,
  isValidCardNumber,
  isValidCvv,
} from './validation'

describe('isValidCardNumber', () => {
  it('accepts the two test card numbers the payment simulation recognizes', () => {
    expect(isValidCardNumber('4242 4242 4242 4242')).toBe(true)
    expect(isValidCardNumber('4000 0000 0000 0002')).toBe(true)
  })

  it('rejects an incomplete or malformed value', () => {
    expect(isValidCardNumber('')).toBe(false)
    expect(isValidCardNumber('4242 4242')).toBe(false)
    expect(isValidCardNumber('4242-4242-4242-4242')).toBe(false)
  })
})

describe('isValidCardHolder', () => {
  it('rejects empty or whitespace-only input', () => {
    expect(isValidCardHolder('')).toBe(false)
    expect(isValidCardHolder('   ')).toBe(false)
  })

  it('accepts a non-empty name', () => {
    expect(isValidCardHolder('Maria Teste')).toBe(true)
  })
})

describe('isValidCvv', () => {
  it('accepts exactly 3 digits', () => {
    expect(isValidCvv('123')).toBe(true)
  })

  it('rejects anything else', () => {
    expect(isValidCvv('')).toBe(false)
    expect(isValidCvv('12')).toBe(false)
    expect(isValidCvv('1234')).toBe(false)
  })
})

describe('isNonEmptyText', () => {
  it('rejects empty or whitespace-only input', () => {
    expect(isNonEmptyText('')).toBe(false)
    expect(isNonEmptyText('   ')).toBe(false)
  })

  it('accepts non-empty text', () => {
    expect(isNonEmptyText('Allianz Parque')).toBe(true)
  })
})

describe('isPositiveInteger', () => {
  it('rejects zero, negative, and non-integer values', () => {
    expect(isPositiveInteger('0')).toBe(false)
    expect(isPositiveInteger('-1')).toBe(false)
    expect(isPositiveInteger('1.5')).toBe(false)
    expect(isPositiveInteger('abc')).toBe(false)
  })

  it('accepts a positive integer', () => {
    expect(isPositiveInteger('50')).toBe(true)
  })
})

describe('isNonNegativeNumber', () => {
  it('rejects a negative value', () => {
    expect(isNonNegativeNumber('-0.01')).toBe(false)
  })

  it('accepts zero and any positive number', () => {
    expect(isNonNegativeNumber('0')).toBe(true)
    expect(isNonNegativeNumber('32.5')).toBe(true)
  })
})

describe('isFutureDatetimeLocal', () => {
  const now = new Date('2026-08-13T12:00:00')

  it('rejects a value at or before now', () => {
    expect(isFutureDatetimeLocal('2026-08-13T12:00', now)).toBe(false)
    expect(isFutureDatetimeLocal('2020-01-01T00:00', now)).toBe(false)
  })

  it('rejects a malformed value', () => {
    expect(isFutureDatetimeLocal('', now)).toBe(false)
  })

  it('accepts a future value', () => {
    expect(isFutureDatetimeLocal('2026-09-01T23:00', now)).toBe(true)
  })
})
