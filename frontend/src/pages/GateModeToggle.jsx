export function GateModeToggle({ mode, onModeChange, t }) {
  return (
    <div className="gate-page__mode" role="group" aria-label={t('gate.modeAriaLabel')}>
      <button
        type="button"
        className={mode === 'camera' ? 'gate-page__mode-button--active' : ''}
        onClick={() => onModeChange('camera')}
      >
        {t('gate.camera')}
      </button>
      <button
        type="button"
        className={mode === 'manual' ? 'gate-page__mode-button--active' : ''}
        onClick={() => onModeChange('manual')}
      >
        {t('gate.manualEntry')}
      </button>
    </div>
  )
}
