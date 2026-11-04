import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import { OrthographicCamera, Vector3 } from 'three'

async function start(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: 'Start mission' }).click()
  await expect(
    page.getByRole('button', { name: 'Pause game', exact: true }),
  ).toBeVisible()
}

async function clickWorldPad(
  page: Page,
  x: number,
  z: number,
  button: 'left' | 'right' = 'left',
) {
  const box = await page
    .locator('[data-testid="game-scene"] canvas')
    .boundingBox()
  if (!box) throw new Error('Missing 3D game canvas')
  const span = 13.5,
    aspect = box.width / box.height
  const camera = new OrthographicCamera(
    -span * aspect,
    span * aspect,
    span,
    -span,
    0.1,
    160,
  )
  camera.position.set(24, 29, 34)
  camera.lookAt(0, 0.8, 0)
  camera.updateMatrixWorld()
  const p = new Vector3(x, 0.12, z).project(camera)
  await page.mouse.click(
    box.x + (p.x * 0.5 + 0.5) * box.width,
    box.y + (-p.y * 0.5 + 0.5) * box.height,
    { button },
  )
}

test('actual 3D hex clicks build a service, deliver requests, win and save stars', async ({
  page,
}) => {
  test.setTimeout(90000)
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await start(page)
  // Wait for the briefing camera's one-second CSS transition before raycasting.
  await page.waitForTimeout(1100)
  await clickWorldPad(page, -5, -2, 'right')
  await expect(
    page.getByRole('button', { name: 'Sector B1: empty', exact: true }),
  ).toBeVisible()
  await clickWorldPad(page, -5, -2)
  await expect(
    page.getByRole('button', {
      name: 'Sector B1: Prefill engine',
      exact: true,
    }),
  ).toBeVisible()
  await clickWorldPad(page, 7, -2)
  await expect(
    page.getByRole('button', { name: 'Sector B4: Decode engine', exact: true }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Toggle game speed' }).click()
  await expect(page.locator('.game-request-lens').first()).toContainText(
    'prompt KV',
    { timeout: 10000 },
  )
  await expect(
    page.getByRole('dialog', { name: 'Mission complete' }),
  ).toBeVisible({ timeout: 65000 })
  await expect(page.locator('.game-result-stats')).toContainText('12')
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem('strata-fleet-command-v1') || '{}')
          .stars['first-light'],
    ),
  ).toBeGreaterThan(0)
  await page.reload()
  await expect(
    page.locator('.game-mission-preview [aria-label="3 of 3 stars"]'),
  ).toBeVisible()
  expect(errors).toEqual([])
})

test('sandbox pause allows upgrades and recycling with real costs; learning mode preserves the run', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Sandbox', exact: true }).click()
  await page.getByRole('button', { name: 'Start mission' }).click()
  await page.getByRole('button', { name: 'Pause game', exact: true }).click()
  const clock = await page.locator('.game-resource-bar').innerText()
  await page.getByRole('button', { name: /Build KV memory bank/ }).click()
  await page
    .getByRole('button', { name: 'Sector A1: empty', exact: true })
    .click()
  await expect(page.locator('.game-resource-bar')).toContainText('570')
  await page.getByRole('button', { name: 'Upgrade · 52', exact: true }).click()
  await expect(page.locator('.game-resource-bar')).toContainText('518')
  await page
    .getByRole('button', { name: 'Recycle for 79 credits', exact: true })
    .click()
  await expect(page.locator('.game-resource-bar')).toContainText('597')
  await page.getByRole('button', { name: 'Learning mode' }).click()
  await expect(page).toHaveURL(/view=explore/)
  await expect(
    page.getByRole('heading', { name: 'The fleet scheduler' }),
  ).toBeVisible()
  await page
    .getByRole('button', { name: /Fleet Command Play the infrastructure game/ })
    .click()
  await expect(
    page.getByRole('button', { name: 'Resume game', exact: true }),
  ).toBeVisible()
  await expect(page.locator('.game-resource-bar')).toContainText('597')
  expect(
    (await page.locator('.game-resource-bar').innerText()).split(
      'SHIFT LEFT',
    )[0],
  ).toContain('100')
  expect(clock).toContain('00:00')
})

test('phone controls stay clickable, missions switch, and request details are available', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await start(page)
  await page.getByRole('button', { name: 'Pause game', exact: true }).click()
  await page
    .getByRole('button', { name: 'Sector B1: empty', exact: true })
    .click()
  await page
    .getByRole('button', { name: 'Sector B4: empty', exact: true })
    .click()
  await page.getByRole('button', { name: /Build KV memory bank/ }).click()
  await page
    .getByRole('button', { name: 'Sector A1: empty', exact: true })
    .click()
  await expect(page.locator('.game-resource-bar')).toContainText('60')
  await page
    .getByRole('button', { name: 'Inspect live requests', exact: true })
    .click()
  await expect(
    page.getByRole('dialog', { name: 'Inspect live requests' }),
  ).toContainText('70B GQA reference')
  await page.getByRole('button', { name: 'Back to the board' }).click()
  await page.getByRole('button', { name: 'Fleet Command mission map' }).click()
  await page.getByRole('button', { name: /Crossing streams/ }).click()
  await expect(page.locator('.game-mission-preview h2')).toHaveText(
    'Crossing streams',
  )
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true)
})

test('request lens follows real in-flight state and pause freezes the deadline', async ({
  page,
}) => {
  await start(page)
  await page
    .getByRole('button', { name: 'Sector B1: empty', exact: true })
    .click()
  await page
    .getByRole('button', { name: 'Sector B4: empty', exact: true })
    .click()
  await expect(page.locator('.game-request-lens').first()).toContainText(
    'prompt KV',
    { timeout: 10000 },
  )
  await page
    .getByRole('button', { name: 'Inspect live requests', exact: true })
    .click()
  const lens = page.getByRole('dialog', { name: 'Inspect live requests' })
  await expect(lens).toContainText('REQ 001')
  const before = await lens.locator('.game-request-summary').textContent()
  await page.waitForTimeout(500)
  await expect(lens.locator('.game-request-summary')).toHaveText(before)
  await page.keyboard.press('Escape')
  await expect(lens).not.toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Resume game', exact: true }),
  ).toBeVisible()
})

test('no-WebGL fallback remains a playable game, including keyboard building and pause', async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      value: () => null,
    }),
  )
  await start(page)
  await expect(page.getByText('TACTICAL BOARD · 2D FALLBACK')).toBeVisible()
  await page
    .getByRole('button', { name: 'Sector B1: empty', exact: true })
    .click()
  await page.keyboard.press('2')
  await page
    .getByRole('button', { name: 'Sector B4: empty', exact: true })
    .click()
  await page.locator('.game-scene').click({ position: { x: 350, y: 200 } })
  await page.keyboard.press('Space')
  await expect(
    page.getByRole('button', { name: 'Resume game', exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Sector B4: Decode engine', exact: true }),
  ).toBeVisible()
})
