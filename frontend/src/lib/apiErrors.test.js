import { describe, expect, it } from 'vitest'
import { translateApiError } from './apiErrors'
import { en } from '../i18n/en'
import { ptBR } from '../i18n/ptBR'

// Same key-resolution shape as LocaleContext.jsx's t(), duplicated here on
// purpose: this is a pure-logic test and should not need to render a
// React provider just to call one lookup function.
function makeT(dictionary) {
  return function t(key, params) {
    const entry = key.split('.').reduce((node, part) => node?.[part], dictionary)
    if (typeof entry === 'function') return entry(params || {})
    if (typeof entry === 'string' && params) {
      return entry.replace(/\{(\w+)\}/g, (_, name) => params[name] ?? '')
    }
    return entry ?? key
  }
}

describe('translateApiError', () => {
  it('translates a known code and interpolates its params, in both dictionaries', () => {
    const err = {
      code: 'EVENT_NOT_FOUND',
      params: { event_id: '42' },
      message: 'event 42 not found',
    }
    expect(translateApiError(err, makeT(en))).toBe('This event could not be found.')
    expect(translateApiError(err, makeT(ptBR))).toBe('Esse evento não foi encontrado.')
  })

  it('interpolates a template that actually uses its params', () => {
    const err = {
      code: 'EMAIL_ALREADY_REGISTERED',
      params: { email: 'ana@example.com' },
      message: 'email ana@example.com is already registered',
    }
    expect(translateApiError(err, makeT(en))).toBe(
      'The email ana@example.com is already registered.',
    )
    expect(translateApiError(err, makeT(ptBR))).toBe('O e-mail ana@example.com já está registrado.')
  })

  it('falls back to the original English message when the code has no dictionary entry', () => {
    const err = { code: 'SOME_FUTURE_CODE_NOT_YET_TRANSLATED', message: 'something went wrong' }
    expect(translateApiError(err, makeT(en))).toBe('something went wrong')
  })

  it('falls back to the original message when there is no code at all', () => {
    const err = { message: 'Could not complete the request.' }
    expect(translateApiError(err, makeT(en))).toBe('Could not complete the request.')
  })
})
