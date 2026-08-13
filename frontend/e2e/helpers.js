// Matches backend/app/e2e_fixtures.py.
export const FIXTURE_ORGANIZER = { email: 'e2e-organizer@tiquetly.com', password: 'tiquetly123' }
export const FIXTURE_GATEKEEPER = { email: 'e2e-gatekeeper@tiquetly.com', password: 'tiquetly123' }
export const FIXTURE_GENERAL_EVENT_TITLE = 'E2E Test Show'
export const FIXTURE_SEATMAP_EVENT_TITLE = 'E2E Test Movie'
export const FIXTURE_SEATMAP_EVENT_VENUE = 'E2E Cinema'

export const APPROVE_CARD = '4242 4242 4242 4242'
export const DECLINE_CARD = '4000 0000 0000 0002'

export function uniqueEmail(tag) {
  return `e2e-${tag}-${Date.now()}-${Math.floor(Math.random() * 10000)}@tiquetly.com`
}

export async function registerAndSignIn(
  page,
  { name = 'E2E Customer', email, password = 'tiquetly123' },
) {
  await page.goto('/register')
  await page.getByLabel('Name').fill(name)
  await page.getByLabel('Email').fill(email)
  await page.locator('.password-field input').fill(password)
  await page.getByRole('button', { name: 'Create account' }).click()
  await page.waitForURL('/')
}

export async function signIn(page, { email, password }) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.locator('.password-field input').fill(password)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await page.waitForURL('/')
}

export async function payWithCard(page, cardNumber) {
  await page.getByLabel('Card number').fill(cardNumber)
  await page.getByLabel('Name on card').fill('E2E Test')
  await page.getByLabel('Expiry').fill('12/30')
  await page.getByLabel('CVV').fill('123')
  await page.getByRole('button', { name: /^Pay / }).click()
}
