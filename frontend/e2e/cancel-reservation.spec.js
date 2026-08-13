import { expect, test } from '@playwright/test'
import { FIXTURE_GENERAL_EVENT_TITLE, registerAndSignIn, uniqueEmail } from './helpers'

test('cancels a pending reservation before paying and releases the stock', async ({ page }) => {
  await registerAndSignIn(page, { email: uniqueEmail('cancel') })

  await page.goto('/')
  await page.getByRole('link', { name: new RegExp(FIXTURE_GENERAL_EVENT_TITLE) }).click()

  const remainingBefore = await page.locator('.event-detail-page__remaining').textContent()

  await page.getByRole('button', { name: 'Reserve' }).click()
  await expect(page.locator('.event-detail-page__confirmation')).toContainText('awaiting payment')

  await page.getByRole('button', { name: 'Give up and cancel reservation' }).click()
  await expect(page.locator('.event-detail-page__declined')).toContainText('Reservation cancelled')

  await expect(page.locator('.event-detail-page__remaining')).toHaveText(remainingBefore)
})
