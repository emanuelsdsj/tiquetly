import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { createStaffAccount, listStaffAccounts } from '../api/admin'
import { PasswordField } from '../components/PasswordField'
import { Spinner } from '../components/Spinner'
import { useAuth } from '../context/AuthContext'
import { useLocale } from '../context/LocaleContext'
import { translateApiError } from '../lib/apiErrors'
import './AdminPage.css'

const ROLES = ['organizer', 'gatekeeper']

function emptyForm() {
  return { name: '', email: '', password: '', role: 'gatekeeper' }
}

export function AdminPage() {
  const { token, user } = useAuth()
  const { t } = useLocale()

  const [staff, setStaff] = useState(null)
  const [listError, setListError] = useState(null)
  const [form, setForm] = useState(emptyForm())
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  useEffect(() => {
    if (user?.role !== 'admin') return
    listStaffAccounts(token)
      .then(setStaff)
      .catch((err) => setListError(translateApiError(err, t)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, token])

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitting(true)
    setSubmitError(null)
    try {
      const created = await createStaffAccount(form, token)
      setStaff((current) => [...(current || []), created])
      setForm(emptyForm())
    } catch (err) {
      setSubmitError(translateApiError(err, t))
    } finally {
      setSubmitting(false)
    }
  }

  if (!user) {
    return (
      <main className="admin-page">
        <p className="admin-page__state">
          <Link to="/entrar">{t('common.signInLinkText')}</Link> {t('admin.signInPrefix')}
        </p>
      </main>
    )
  }

  if (user.role !== 'admin') {
    return (
      <main className="admin-page">
        <p className="admin-page__state">{t('admin.restricted')}</p>
      </main>
    )
  }

  return (
    <main className="admin-page">
      <header className="admin-page__head">
        <h1 className="admin-page__title">{t('admin.title')}</h1>
        <p className="admin-page__subtitle">{t('admin.subtitle')}</p>
      </header>

      <div className="admin-page__layout">
        <form className="admin-page__form" onSubmit={handleSubmit}>
          <h2 className="admin-page__form-title">{t('admin.createTitle')}</h2>
          <label>
            {t('admin.formName')}
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </label>
          <label>
            {t('admin.formEmail')}
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </label>
          <PasswordField
            label={t('admin.formPassword')}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            minLength={6}
            autoComplete="new-password"
          />
          <div className="admin-page__roles" role="group" aria-label={t('admin.roleAriaLabel')}>
            {ROLES.map((role) => (
              <button
                key={role}
                type="button"
                className={`admin-page__role-chip ${form.role === role ? 'admin-page__role-chip--active' : ''}`}
                onClick={() => setForm({ ...form, role })}
                aria-pressed={form.role === role}
              >
                {t(`admin.role.${role}`)}
              </button>
            ))}
          </div>
          {submitError && <p className="admin-page__error">{submitError}</p>}
          <button type="submit" disabled={submitting}>
            {submitting ? t('admin.creating') : t('admin.create')}
          </button>
        </form>

        <div className="admin-page__list-column">
          <h2 className="admin-page__form-title">{t('admin.listTitle')}</h2>
          {listError && <p className="admin-page__error">{listError}</p>}
          {!listError && staff === null && (
            <p className="admin-page__state">
              <Spinner />
              {t('admin.loading')}
            </p>
          )}
          {staff !== null && staff.length === 0 && (
            <p className="admin-page__state">{t('admin.empty')}</p>
          )}
          {staff !== null && staff.length > 0 && (
            <ul className="admin-page__staff-list">
              {staff.map((account) => (
                <li key={account.id} className="admin-staff">
                  <span className={`admin-staff__role admin-staff__role--${account.role}`}>
                    {t(`admin.role.${account.role}`)}
                  </span>
                  <span className="admin-staff__name">{account.name}</span>
                  <span className="admin-staff__email">{account.email}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  )
}
