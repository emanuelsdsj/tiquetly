import { expect, test } from '@playwright/test'
import {
  DECLINE_CARD,
  FIXTURE_SEATMAP_EVENT_TITLE,
  payWithCard,
  registerAndSignIn,
  uniqueEmail,
} from './helpers'

test('reserves a seat, pays with the declining test card, and the seat becomes reservable again', async ({
  page,
}) => {
  await registerAndSignIn(page, { email: uniqueEmail('reserve-seatmap') })

  await page.goto('/')
  await page.getByRole('link', { name: new RegExp(FIXTURE_SEATMAP_EVENT_TITLE) }).click()
  await expect(page.getByRole('heading', { name: FIXTURE_SEATMAP_EVENT_TITLE })).toBeVisible()

  const seat = page.locator('.seat-map__seat:not([disabled])').first()
  const seatLabel = await seat.getAttribute('aria-label')
  await seat.click()
  await expect(page.locator('.event-detail-page__seat-summary')).toContainText('1 seat')

  await page.getByRole('button', { name: 'Reserve' }).click()
  await expect(page.locator('.event-detail-page__confirmation')).toContainText('awaiting payment')

  await payWithCard(page, DECLINE_CARD)

  await expect(page.locator('.event-detail-page__declined')).toContainText('Payment declined')

  // Same seat is offered again, proving the decline released it.
  const seatAgain = page.getByRole('button', { name: seatLabel, exact: true })
  await expect(seatAgain).toBeEnabled()
})
