import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLocale } from '../context/LocaleContext'
import './Nav.css'

const LOCALES = [
  { value: 'en', label: 'EN' },
  { value: 'pt-BR', label: 'PT-BR' },
]

export function Nav() {
  const { user, signOut } = useAuth()
  const { t, locale, setLocale } = useLocale()
  const navigate = useNavigate()

  function handleSignOut() {
    signOut()
    navigate('/')
  }

  return (
    <nav className="nav">
      <Link to="/" className="nav__brand">
        Tiquetly
      </Link>
      <div className="nav__links">
        {user ? (
          <>
            {user.role === 'customer' && <Link to="/meus-ingressos">{t('nav.myTickets')}</Link>}
            {user.role === 'gatekeeper' && <Link to="/portaria">{t('nav.gate')}</Link>}
            {user.role === 'organizer' && <Link to="/organizador">{t('nav.myEvents')}</Link>}
            {user.role === 'admin' && <Link to="/admin">{t('nav.admin')}</Link>}
            <span className="nav__user">{user.name}</span>
            <button type="button" className="nav__link-button" onClick={handleSignOut}>
              {t('nav.signOut')}
            </button>
          </>
        ) : (
          <>
            <Link to="/entrar">{t('nav.signIn')}</Link>
            <Link to="/registrar">{t('nav.createAccount')}</Link>
          </>
        )}
        <div className="nav__locale" role="group" aria-label="Language">
          {LOCALES.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`nav__locale-button ${locale === option.value ? 'nav__locale-button--active' : ''}`}
              onClick={() => setLocale(option.value)}
              aria-pressed={locale === option.value}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </nav>
  )
}
