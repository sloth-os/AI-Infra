import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

const canvas = '[data-testid="game-scene"] canvas'
async function start(page: Page, sandbox = false) {
  await page.goto('/')
  if (sandbox)
    await page.getByRole('button', { name: 'Sandbox', exact: true }).click()
  await expect(page.locator(canvas)).toHaveCount(1)
  await page.getByRole('button', { name: 'Start mission' }).click()
}
async function settled(page: Page) {
  await expect(page.locator(canvas)).toHaveAttribute(
    'data-camera-moving',
    'false',
    { timeout: 15000 },
  )
}
async function install(page: Page, sector: string, module: string) {
  await page
    .getByRole('button', { name: `Sector ${sector}: empty`, exact: true })
    .click()
  await page
    .getByRole('button', { name: `Install ${module}`, exact: true })
    .click()
  await page.getByRole('button', { name: 'Close spatial controls' }).click()
}

test('Fusion is the default: world-anchored construction delivers a complete winning mission', async ({
  page,
}) => {
  test.setTimeout(100000)
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await start(page)
  await page.getByRole('button', { name: 'Pause game', exact: true }).click()
  await settled(page)
  await expect(page.locator('.fleet-game')).toHaveClass(/is-fusion/)
  await expect(page.locator('.game-left-hud')).toBeHidden()
  await install(page, 'B1', 'Prefill engine')
  await expect(page.getByTestId('fusion-credits')).toHaveText('240')
  await install(page, 'B4', 'Decode engine')
  await expect(page.getByTestId('fusion-credits')).toHaveText('140')
  await page.getByRole('button', { name: 'Resume game', exact: true }).click()
  await page.getByRole('button', { name: 'Toggle game speed' }).click()
  await expect(
    page.getByRole('button', { name: 'Select live request' }),
  ).toBeVisible({ timeout: 12000 })
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
  expect(errors).toEqual([])
})

test('Fusion keeps moving-request controls still, then clears the view for a camera ride', async ({
  page,
}) => {
  test.setTimeout(70000)
  await start(page, true)
  await settled(page)
  await page.getByRole('button', { name: 'Select live request' }).click()
  const ride = page.getByRole('button', {
    name: 'Ride alongside request',
    exact: true,
  })
  await expect(ride).toBeVisible()
  await page.locator('.fusion-spatial-card').evaluate(async (element) => {
    await Promise.all(
      element.getAnimations().map((animation) => animation.finished),
    )
  })
  const before = await ride.boundingBox()
  await page.waitForTimeout(600)
  const after = await ride.boundingBox()
  expect(
    Math.abs(before!.x - after!.x) + Math.abs(before!.y - after!.y),
  ).toBeLessThan(1)
  const pose = await page.locator(canvas).getAttribute('data-camera-pose')
  await ride.click()
  await expect(page.locator('.fusion-spatial-card')).toHaveCount(0)
  await expect(page.locator(canvas)).toHaveAttribute(
    'data-camera-view',
    'follow',
  )
  await expect
    .poll(() => page.locator(canvas).getAttribute('data-camera-pose'))
    .not.toBe(pose)
  await page.getByRole('button', { name: 'Pause game', exact: true }).click()
  await page
    .getByRole('button', { name: 'KV memory lens', exact: true })
    .click()
  await expect(page.locator(canvas)).toHaveAttribute('data-lens', 'memory')
  await page.getByRole('button', { name: 'Leave orbit', exact: true }).click()
  await page
    .getByRole('button', { name: 'Overview camera', exact: true })
    .click()
  await settled(page)
  await expect(
    page.getByRole('button', {
      name: 'Sector B1: Prefill engine',
      exact: true,
    }),
  ).toContainText('MiB')
})

test('Fusion camera presets, focus, label controls and cinema mode share one persistent world', async ({
  page,
}) => {
  test.setTimeout(70000)
  await start(page, true)
  await page.getByRole('button', { name: 'Pause game', exact: true }).click()
  await settled(page)
  const scene = await page.locator(canvas).elementHandle()
  const overview = await page.locator(canvas).getAttribute('data-camera-pose')
  await page
    .getByRole('button', { name: 'Top-down camera', exact: true })
    .click()
  await settled(page)
  await expect(page.locator(canvas)).toHaveAttribute('data-camera-view', 'top')
  expect(await page.locator(canvas).getAttribute('data-camera-pose')).not.toBe(
    overview,
  )
  await page
    .getByRole('button', { name: 'Overview camera', exact: true })
    .click()
  await settled(page)
  await page
    .getByRole('button', { name: 'Sector B1: Prefill engine', exact: true })
    .click()
  await page.getByRole('button', { name: 'Focus selected module' }).click()
  await settled(page)
  await expect(page.locator(canvas)).toHaveAttribute(
    'data-camera-view',
    'focus',
  )
  await expect(page.locator('.fusion-spatial-card')).toHaveCount(0)
  await page.getByRole('button', { name: 'Hide world labels' }).click()
  await expect(
    page.getByRole('button', {
      name: 'Sector B1: Prefill engine',
      exact: true,
    }),
  ).toHaveCount(0)
  await page.getByRole('button', { name: 'Show world labels' }).click()
  await page.getByRole('button', { name: 'Enter cinema mode' }).click()
  await expect(
    page.getByRole('button', { name: /Show controls/ }),
  ).toBeVisible()
  await expect(page.locator('.game-header')).toBeHidden()
  await page.keyboard.press('h')
  await expect(page.locator('.fusion-control-deck')).toBeVisible()
  expect(
    await page
      .locator(canvas)
      .evaluate((el, previous) => el === previous, scene),
  ).toBe(true)
})

test('Fusion construction and contextual controls fit a phone without covering the command dock', async ({
  page,
}) => {
  test.setTimeout(70000)
  await page.setViewportSize({ width: 390, height: 844 })
  await start(page)
  await page.getByRole('button', { name: 'Pause game', exact: true }).click()
  await page.getByRole('button', { name: 'Open sector grid' }).click()
  await page
    .getByRole('button', { name: 'Grid sector B1: empty', exact: true })
    .click()
  const card = page.locator('.fusion-spatial-card')
  await expect(card).toBeVisible()
  await page
    .getByRole('button', { name: 'Install Prefill engine', exact: true })
    .click()
  await expect(page.getByTestId('fusion-credits')).toHaveText('240')
  await page.getByRole('button', { name: 'Close spatial controls' }).click()
  await page.getByRole('button', { name: 'Open sector grid' }).click()
  await page
    .getByRole('button', { name: 'Grid sector B4: empty', exact: true })
    .click()
  await page
    .getByRole('button', { name: 'Install Decode engine', exact: true })
    .click()
  await expect(page.getByTestId('fusion-credits')).toHaveText('140')
  await page.setViewportSize({ width: 320, height: 700 })
  await expect
    .poll(async () => {
      const b = await card.boundingBox()
      return b!.x >= 13 && b!.x + b!.width <= 307
    })
    .toBe(true)
  const box = await card.boundingBox(),
    dock = await page.locator('.fusion-control-deck').boundingBox()
  expect(box!.y + box!.height).toBeLessThan(dock!.y)
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false)
  await page.getByRole('button', { name: 'Close spatial controls' }).click()
  await page
    .getByRole('button', { name: 'Build KV memory bank', exact: true })
    .click()
  await page.getByRole('button', { name: 'Open sector grid' }).click()
  await page
    .getByRole('button', { name: 'Grid sector A1: empty', exact: true })
    .click()
  await expect(page.getByTestId('fusion-credits')).toHaveText('60')
})

test('Fusion research, tactical mode and learning round trips preserve the exact paused service', async ({
  page,
}) => {
  test.setTimeout(70000)
  await start(page, true)
  await page.getByRole('button', { name: 'Pause game', exact: true }).click()
  await page.getByRole('button', { name: 'Open operations research' }).click()
  await page
    .getByRole('button', { name: /Continuous batching Share decode/ })
    .click()
  await expect(page.getByTestId('fusion-credits')).toHaveText('565')
  await page.getByRole('button', { name: 'Close command drawer' }).click()
  await page
    .getByRole('button', { name: 'Switch to tactical interface' })
    .click()
  await expect(page.getByTestId('game-credits')).toHaveText('565')
  await expect(
    page.getByRole('button', { name: /Continuous batching/ }),
  ).toBeDisabled()
  await page.getByRole('button', { name: 'Learning mode', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'The fleet scheduler' }),
  ).toBeVisible()
  await page
    .getByRole('button', { name: /Fleet Command Play the infrastructure game/ })
    .click()
  await page
    .getByRole('button', { name: 'Switch to immersive interface' })
    .click()
  await expect(page.getByTestId('fusion-credits')).toHaveText('565')
  await expect(
    page.getByRole('button', { name: 'Resume game', exact: true }),
  ).toBeVisible()
})

test('Fusion honors reduced motion with immediate camera framing and no automatic orbit', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await start(page, true)
  await page.getByRole('button', { name: 'Pause game', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Orbit camera', exact: true }),
  ).toBeDisabled()
  await expect(page.locator(canvas)).toHaveAttribute(
    'data-camera-moving',
    'false',
  )
  await page
    .getByRole('button', { name: 'Top-down camera', exact: true })
    .click()
  await expect(page.locator(canvas)).toHaveAttribute(
    'data-camera-moving',
    'false',
  )
  await expect(page.locator(canvas)).toHaveAttribute('data-camera-view', 'top')
})

test('Fusion remains playable without WebGL and keeps fallback construction above mobile controls', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.addInitScript(() =>
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      value: () => null,
    }),
  )
  await page.goto('/')
  await page.getByRole('button', { name: 'Start mission' }).click()
  await page.getByRole('button', { name: 'Pause game', exact: true }).click()
  await expect(page.getByText('TACTICAL BOARD · 2D FALLBACK')).toBeVisible()
  await page.getByRole('button', { name: 'Open sector grid' }).click()
  await page
    .getByRole('button', { name: 'Grid sector B1: empty', exact: true })
    .click()
  await page
    .getByRole('button', { name: 'Install Prefill engine', exact: true })
    .click()
  await expect(page.getByTestId('fusion-credits')).toHaveText('240')
  const card = await page.locator('.fusion-spatial-card').boundingBox(),
    dock = await page.locator('.fusion-control-deck').boundingBox()
  expect(card!.y + card!.height).toBeLessThan(dock!.y)
})
