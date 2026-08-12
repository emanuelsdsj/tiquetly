import { useState } from 'react'
import { payReservation } from '../api/reservations'
import { useAuth } from '../context/AuthContext'
import { formatPrice } from '../lib/format'
import './PaymentForm.css'

export function PaymentForm({ reservation, amount, onPaid, onDeclined }) {
  const { token } = useAuth()
  const [cardNumber, setCardNumber] = useState('')
  const [cardHolder, setCardHolder] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvv, setCvv] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(formEvent) {
    formEvent.preventDefault()
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
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="payment-form" onSubmit={handleSubmit}>
      <p className="payment-form__amount">Total a pagar: {formatPrice(amount)}</p>
      <label className="payment-form__field">
        <span>Número do cartão</span>
        <input
          type="text"
          inputMode="numeric"
          placeholder="0000 0000 0000 0000"
          value={cardNumber}
          onChange={(event) => setCardNumber(event.target.value)}
          required
        />
      </label>
      <label className="payment-form__field">
        <span>Nome no cartão</span>
        <input
          type="text"
          value={cardHolder}
          onChange={(event) => setCardHolder(event.target.value)}
          required
        />
      </label>
      <div className="payment-form__row">
        <label className="payment-form__field">
          <span>Validade</span>
          <input
            type="text"
            placeholder="MM/AA"
            value={expiry}
            onChange={(event) => setExpiry(event.target.value)}
            required
          />
        </label>
        <label className="payment-form__field">
          <span>CVV</span>
          <input
            type="text"
            inputMode="numeric"
            placeholder="123"
            value={cvv}
            onChange={(event) => setCvv(event.target.value)}
            required
          />
        </label>
      </div>
      <p className="payment-form__hint">
        Pagamento simulado, sem cobrança real. Use <strong>4242 4242 4242 4242</strong> para aprovar
        ou <strong>4000 0000 0000 0002</strong> para recusar de propósito.
      </p>
      {error && <p className="payment-form__error">{error}</p>}
      <button type="submit" disabled={submitting}>
        {submitting ? 'Processando...' : `Pagar ${formatPrice(amount)}`}
      </button>
    </form>
  )
}
