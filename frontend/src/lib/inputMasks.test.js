import { describe, expect, it } from 'vitest'
import { maskCardNumber, maskDigits, maskExpiry } from './inputMasks'

describe('maskDigits', () => {
  it('strips non-digit characters', () => {
    expect(maskDigits('4a2b', 10)).toBe('42')
  })

  it('caps the result at maxDigits', () => {
    expect(maskDigits('123456', 3)).toBe('123')
  })
})

describe('maskCardNumber', () => {
  it('groups digits in fours as they are typed', () => {
    expect(maskCardNumber('4')).toBe('4')
    expect(maskCardNumber('4242')).toBe('4242')
    expect(maskCardNumber('42424')).toBe('4242 4')
    expect(maskCardNumber('4242424242424242')).toBe('4242 4242 4242 4242')
  })

  it('ignores non-digits and caps at 16 digits', () => {
    expect(maskCardNumber('4242-4242-4242-4242-9999')).toBe('4242 4242 4242 4242')
  })
})

describe('maskExpiry', () => {
  it('inserts the slash after the month once a third digit is typed', () => {
    expect(maskExpiry('0')).toBe('0')
    expect(maskExpiry('01')).toBe('01')
    expect(maskExpiry('012')).toBe('01/2')
    expect(maskExpiry('0102')).toBe('01/02')
  })

  it('ignores non-digits and caps at 4 digits', () => {
    expect(maskExpiry('01/02/2099')).toBe('01/02')
  })
})
