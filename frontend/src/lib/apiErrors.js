export function translateApiError(err, t) {
  if (!err.code) return err.message
  const translated = t(`errors.${err.code}`, err.params)
  return translated === `errors.${err.code}` ? err.message : translated
}
