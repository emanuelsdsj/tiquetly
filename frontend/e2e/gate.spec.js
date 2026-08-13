import { expect, test } from '@playwright/test'
import {
  APPROVE_CARD,
  FIXTURE_GATEKEEPER,
  FIXTURE_SEATMAP_EVENT_TITLE,
  FIXTURE_SEATMAP_EVENT_VENUE,
  payWithCard,
  registerAndSignIn,
  signIn,
  uniqueEmail,
} from './helpers'

test('validates a ticket, rejects re-validating it, and rejects an unknown code', async ({
  page,
}) => {
  // Manufacture a real ticket through the UI rather than depending on a
  // pre-seeded one: keeps this spec self-contained and exercises the
  // purchase flow at the same time.
  await registerAndSignIn(page, { email: uniqueEmail('gate') })
  await page.goto('/')
  await page.getByRole('link', { name: new RegExp(FIXTURE_SEATMAP_EVENT_TITLE) }).click()
  await page.locator('.seat-map__seat:not([disabled])').first().click()
  await page.getByRole('button', { name: 'Reserve' }).click()
  await payWithCard(page, APPROVE_CARD)
  await page
    .locator('.event-detail-page__confirmation')
    .getByRole('link', { name: 'My tickets' })
    .click()
  const code = await page.locator('.ticket-card__code').first().textContent()

  await page.getByRole('button', { name: 'Sign out' }).click()
  await signIn(page, FIXTURE_GATEKEEPER)

  await page.goto('/gate')
  await page
    .getByLabel('Event')
    .selectOption({ label: `${FIXTURE_SEATMAP_EVENT_TITLE} · ${FIXTURE_SEATMAP_EVENT_VENUE}` })
  await page.getByRole('button', { name: 'Type code in' }).click()

  await page.getByPlaceholder('Ticket code').fill(code)
  await page.getByRole('button', { name: 'Validate', exact: true }).click()
  await expect(page.locator('.gate-page__result-title')).toHaveText('Valid ticket')

  await page.getByRole('button', { name: 'Validate next' }).click()
  await page.getByPlaceholder('Ticket code').fill(code)
  await page.getByRole('button', { name: 'Validate', exact: true }).click()
  await expect(page.locator('.gate-page__result-title')).toHaveText('Ticket already used')

  await page.getByRole('button', { name: 'Validate next' }).click()
  await page.getByPlaceholder('Ticket code').fill('00000000-0000-0000-0000-000000000000')
  await page.getByRole('button', { name: 'Validate', exact: true }).click()
  await expect(page.locator('.gate-page__result-title')).toHaveText('Invalid ticket')
})
