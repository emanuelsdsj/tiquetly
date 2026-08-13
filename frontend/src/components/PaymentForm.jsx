import { useState } from 'react'
import { payReservation } from '../api/reservations'
import { useAuth } from '../context/AuthContext'
import { useLocale } from '../context/LocaleContext'
import { translateApiError } from '../lib/apiErrors'
import { formatPrice } from '../lib/format'
import { isExpiryValid, maskCardNumber, maskDigits, maskExpiry } from '../lib/inputMasks'
import './PaymentForm.css'

const APPROVE_CARD = '4242 4242 4242 4242'
const DECLINE_CARD = '4000 0000 0000 0002'

export function PaymentForm({ reservation, amount, onPaid, onDeclined }) {
  const { token } = useAuth()
  const { t, locale } = useLocale()
  const [cardNumber, setCardNumber] = useState('')
  const [cardHolder, setCardHolder] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvv, setCvv] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(formEvent) {
    formEvent.preventDefault()
    if (!isExpiryValid(expiry)) {
      setError(t('paymentForm.invalidExpiry'))
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const updated = await payReservation(
        reservation.id,
        { card_number: cardNumber, card_holder: cardHolder, expiry, cvv },
        token,
      )
      if (updated.status === 'paid') onPaid(updated)
      else onDeclined(updated)
    } catch (err) {
      setError(translateApiError(err, t))
    } finally {
      setSubmitting(false)
    }
  }

  const formattedAmount = formatPrice(amount, locale)

  return (
    <form className="payment-form" onSubmit={handleSubmit}>
      <p className="payment-form__amount">
        {t('paymentForm.totalToPay', { amount: formattedAmount })}
      </p>
      <label className="payment-form__field">
        <span>{t('paymentForm.cardNumber')}</span>
        <input
          type="text"
          inputMode="numeric"
          placeholder="0000 0000 0000 0000"
          value={cardNumber}
          onChange={(event) => setCardNumber(maskCardNumber(event.target.value))}
          maxLength={19}
          required
        />
      </label>
      <label className="payment-form__field">
        <span>{t('paymentForm.cardHolder')}</span>
        <input
          type="text"
          value={cardHolder}
          onChange={(event) => setCardHolder(event.target.value)}
          required
        />
      </label>
      <div className="payment-form__row">
        <label className="payment-form__field">
          <span>{t('paymentForm.expiry')}</span>
          <input
            type="text"
            inputMode="numeric"
            placeholder={t('paymentForm.expiryPlaceholder')}
            value={expiry}
            onChange={(event) => setExpiry(maskExpiry(event.target.value))}
            maxLength={5}
            required
          />
        </label>
        <label className="payment-form__field">
          <span>{t('paymentForm.cvv')}</span>
          <input
            type="text"
            inputMode="numeric"
            placeholder="123"
            value={cvv}
            onChange={(event) => setCvv(maskDigits(event.target.value, 3))}
            maxLength={3}
            required
          />
        </label>
      </div>
      <p className="payment-form__hint">
        {t('paymentForm.hintPrefix')}
        <strong>{APPROVE_CARD}</strong>
        {t('paymentForm.hintMiddle')}
        <strong>{DECLINE_CARD}</strong>
        {t('paymentForm.hintSuffix')}
      </p>
      {error && <p className="payment-form__error">{error}</p>}
      <button type="submit" disabled={submitting}>
        {submitting
          ? t('paymentForm.processing')
          : t('paymentForm.pay', { amount: formattedAmount })}
      </button>
    </form>
  )
}
