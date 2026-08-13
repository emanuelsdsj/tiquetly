import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { login, register } from '../api/auth'
import { useAuth } from '../context/AuthContext'
import { useLocale } from '../context/LocaleContext'
import { PasswordField } from '../components/PasswordField'
import { translateApiError } from '../lib/apiErrors'
import './AuthForm.css'

export function RegisterPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const { signIn } = useAuth()
  const { t } = useLocale()
  const navigate = useNavigate()

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await register(name, email, password)
      const { access_token: accessToken } = await login(email, password)
      signIn(accessToken)
      navigate('/')
    } catch (err) {
      setError(translateApiError(err, t))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <h1 className="auth-page__title">{t('auth.register.title')}</h1>
      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          {t('auth.register.name')}
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
        </label>
        <label>
          {t('auth.register.email')}
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <PasswordField
          label={t('auth.register.password')}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          minLength={6}
          autoComplete="new-password"
        />
        {error && <p className="auth-page__error">{error}</p>}
        <button type="submit" disabled={submitting}>
          {submitting ? t('auth.register.submitting') : t('auth.register.submit')}
        </button>
      </form>
      <p className="auth-page__switch">
        {t('auth.register.hasAccount')} <Link to="/login">{t('auth.register.signIn')}</Link>
      </p>
    </main>
  )
}
