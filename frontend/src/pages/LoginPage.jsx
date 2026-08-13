import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { login } from '../api/auth'
import { useAuth } from '../context/AuthContext'
import { useLocale } from '../context/LocaleContext'
import { PasswordField } from '../components/PasswordField'
import { translateApiError } from '../lib/apiErrors'
import './AuthForm.css'

export function LoginPage() {
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
      <h1 className="auth-page__title">{t('auth.login.title')}</h1>
      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          {t('auth.login.email')}
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <PasswordField
          label={t('auth.login.password')}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
        />
        {error && <p className="auth-page__error">{error}</p>}
        <button type="submit" disabled={submitting}>
          {submitting ? t('auth.login.submitting') : t('auth.login.submit')}
        </button>
      </form>
      <p className="auth-page__switch">
        {t('auth.login.noAccount')} <Link to="/register">{t('auth.login.createAccount')}</Link>
      </p>
    </main>
  )
}
