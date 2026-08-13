import { useState } from 'react'
import { useLocale } from '../context/LocaleContext'
import './PasswordField.css'

export function PasswordField({ label, value, onChange, minLength, autoComplete }) {
  const [visible, setVisible] = useState(false)
  const { t } = useLocale()

  return (
    <label className="password-field">
      {label}
      <span className="password-field__control">
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          minLength={minLength}
          autoComplete={autoComplete}
          required
        />
        <button
          type="button"
          className="password-field__toggle"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? t('passwordField.hideAria') : t('passwordField.showAria')}
        >
          {visible ? t('passwordField.hide') : t('passwordField.show')}
        </button>
      </span>
    </label>
  )
}
