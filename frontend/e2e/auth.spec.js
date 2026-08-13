import { expect, test } from '@playwright/test'
import { uniqueEmail } from './helpers'

test('registers, signs out, signs back in, and rejects the wrong password', async ({ page }) => {
  const email = uniqueEmail('auth')

  await page.goto('/register')
  await page.getByLabel('Name').fill('E2E Auth Customer')
  await page.getByLabel('Email').fill(email)
  await page.locator('.password-field input').fill('tiquetly123')
  await page.getByRole('button', { name: 'Create account' }).click()
  await page.waitForURL('/')
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible()

  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible()

  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.locator('.password-field input').fill('wrong-password')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page.locator('.auth-page__error')).toHaveText('Invalid email or password.')

  await page.locator('.password-field input').fill('tiquetly123')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await page.waitForURL('/')
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible()
})
