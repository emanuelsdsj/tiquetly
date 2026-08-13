import { expect, test } from '@playwright/test'
import {
  APPROVE_CARD,
  FIXTURE_GENERAL_EVENT_TITLE,
  payWithCard,
  registerAndSignIn,
  uniqueEmail,
} from './helpers'

test('reserves a general-admission ticket and pays with the approving test card', async ({
  page,
}) => {
  await registerAndSignIn(page, { email: uniqueEmail('reserve-general') })

  await page.goto('/')
  await page.getByRole('link', { name: new RegExp(FIXTURE_GENERAL_EVENT_TITLE) }).click()
  await expect(page.getByRole('heading', { name: FIXTURE_GENERAL_EVENT_TITLE })).toBeVisible()

  await page.getByRole('button', { name: 'Reserve' }).click()
  await expect(page.locator('.event-detail-page__confirmation')).toContainText('awaiting payment')

  await payWithCard(page, APPROVE_CARD)

  await expect(page.locator('.event-detail-page__confirmation')).toContainText('Payment approved')
  await page
    .locator('.event-detail-page__confirmation')
    .getByRole('link', { name: 'My tickets' })
    .click()
  await expect(page.locator('.ticket-card')).toContainText(FIXTURE_GENERAL_EVENT_TITLE)
  await expect(page.locator('.ticket-card__qr')).toBeVisible()
})
