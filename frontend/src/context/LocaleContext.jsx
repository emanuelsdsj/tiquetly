import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { en } from '../i18n/en'
import { ptBR } from '../i18n/ptBR'
import { getStoredLocale, setStoredLocale } from '../lib/locale'

const DICTIONARIES = { en, 'pt-BR': ptBR }
const DEFAULT_LOCALE = 'en'

const LocaleContext = createContext(null)

function resolve(dictionary, key) {
  return key.split('.').reduce((node, part) => node?.[part], dictionary)
}

export function LocaleProvider({ children }) {
  const [locale, setLocaleState] = useState(() => getStoredLocale() || DEFAULT_LOCALE)

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  const value = useMemo(() => {
    const dictionary = DICTIONARIES[locale] || DICTIONARIES[DEFAULT_LOCALE]

    function t(key, params) {
      const entry = resolve(dictionary, key)
      if (typeof entry === 'function') return entry(params || {})
      if (typeof entry === 'string' && params) {
        return entry.replace(/\{(\w+)\}/g, (_, name) => params[name] ?? '')
      }
      return entry ?? key
    }

    function setLocale(nextLocale) {
      setStoredLocale(nextLocale)
      setLocaleState(nextLocale)
    }

    return { locale, setLocale, t }
  }, [locale])

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useLocale() {
  return useContext(LocaleContext)
}
