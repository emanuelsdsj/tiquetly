export function GateManualEntry({ value, onChange, onSubmit, submitting, t }) {
  return (
    <form className="gate-page__manual" onSubmit={onSubmit}>
      <input
        type="text"
        placeholder={t('gate.codePlaceholder')}
        value={value}
        onChange={onChange}
        autoFocus
      />
      <button type="submit" disabled={submitting}>
        {submitting ? t('gate.validating') : t('gate.validate')}
      </button>
    </form>
  )
}
