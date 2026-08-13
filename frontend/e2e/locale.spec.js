import { expect, test } from '@playwright/test'

test('defaults to English, toggles to Portuguese, and translates a backend error either way', async ({
  page,
}) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Tiquetly' })).toBeVisible()
  await expect(page.locator('.browse-page__subtitle')).toHaveText(
    'Shows and movies with tickets available now.',
  )

  await page.getByRole('button', { name: 'PT-BR' }).click()
  await expect(page.locator('.browse-page__subtitle')).toHaveText(
    'Shows e filmes com ingresso disponível agora.',
  )

  // The same backend error code (AUTH_INVALID_CREDENTIALS) renders
  // translated: this is the direct regression check for ADR 0020.
  await page.goto('/entrar')
  await page.getByLabel('E-mail').fill('nobody@tiquetly.com')
  await page.locator('.password-field input').fill('wrong-password')
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page.locator('.auth-page__error')).toHaveText('E-mail ou senha inválidos.')

  await page.reload()
  await expect(page.getByRole('button', { name: 'PT-BR' })).toHaveAttribute('aria-pressed', 'true')

  await page.getByRole('button', { name: 'EN', exact: true }).click()
  await page.getByLabel('Email').fill('nobody@tiquetly.com')
  await page.locator('.password-field input').fill('wrong-password')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page.locator('.auth-page__error')).toHaveText('Invalid email or password.')
})
