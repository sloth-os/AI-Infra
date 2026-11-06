import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
const gameCanvas = '[data-testid="game-scene"] canvas',
  learnCanvas = '.learning-world canvas'
async function sandbox(page: Page) {
  await page.goto('/?campaign=serving')
  await page.getByRole('button', { name: 'Sandbox', exact: true }).click()
  await page.getByRole('button', { name: 'Start mission', exact: true }).click()
  await page.getByRole('button', { name: 'Pause game', exact: true }).click()
}
async function lab(page: Page) {
  await page.goto('/?view=lab&learn=fusion')
  await page.getByRole('button', { name: /Learn by solving/ }).click()
}

test('operator decisions change queue policy, memory admission and a resource-constrained reserve while pause freezes the ability', async ({
  page,
}) => {
  await sandbox(page)
  await page
    .getByRole('button', { name: 'Open operations research', exact: true })
    .click()
  await page
    .getByRole('combobox', { name: 'Queue scheduling policy', exact: true })
    .selectOption('deadline')
  await page
    .getByRole('checkbox', { name: 'Allow memory backfill', exact: true })
    .check()
  await page
    .getByRole('button', { name: 'Activate capacity surge', exact: true })
    .click()
  await expect(
    page.getByRole('meter', { name: 'Reserve energy', exact: true }),
  ).toHaveAttribute('aria-valuenow', '40')
  const active = page.getByRole('button', {
    name: 'Surge active · 6.0s',
    exact: true,
  })
  await expect(active).toBeDisabled()
  await page.waitForTimeout(400)
  await expect(active).toBeVisible()
  await expect(page.locator('.fusion-resources')).toContainText('7')
  await expect(
    page
      .getByRole('combobox', { name: 'Capacity reserve target', exact: true })
      .locator('option'),
  ).toHaveCount(2)
  await page
    .getByRole('button', { name: 'Optional service contracts', exact: true })
    .click()
  await expect(page.locator('.ops-contracts article')).toHaveCount(3)
  for (const button of await page.locator('.ops-contracts button').all())
    await expect(button).toBeDisabled()
})

test('sandbox stress drills add real waiting work and enforce their own cooldown', async ({
  page,
}) => {
  await sandbox(page)
  await page
    .getByRole('button', { name: 'Open operations research', exact: true })
    .click()
  await page
    .getByRole('button', { name: 'Launch context drill', exact: true })
    .click()
  await expect(page.locator('.fleet-game')).toContainText(
    '8 real long-context drill requests joined the queue',
  )
  await expect(
    page.getByRole('button', { name: 'Launch context drill', exact: true }),
  ).toBeDisabled()
  await expect(
    page.getByRole('button', { name: 'Launch burst drill', exact: true }),
  ).toBeDisabled()
  await expect(page.locator('.ops-drills')).toContainText('15.0s')
})

test('quality settings persist across both modes without replacing a canvas and shaders compile without browser errors', async ({
  page,
}) => {
  test.setTimeout(70000)
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  await sandbox(page)
  const original = await page.locator(gameCanvas).elementHandle()
  await page.locator('.game-header .visual-settings summary').click()
  await page
    .locator('.game-header .visual-settings')
    .getByRole('button', { name: /Cinematic/ })
    .click()
  await expect(page.locator(gameCanvas)).toHaveAttribute(
    'data-vfx-quality',
    'cinematic',
  )
  await page.getByRole('button', { name: 'Learning mode', exact: true }).click()
  await expect(page.locator(learnCanvas)).toHaveAttribute(
    'data-vfx-quality',
    'cinematic',
  )
  await page
    .getByRole('button', {
      name: 'Switch to classic learning layout',
      exact: true,
    })
    .click()
  await expect(
    page.locator('[data-testid="infrastructure-scene"]:visible canvas'),
  ).toHaveAttribute('data-vfx-quality', 'cinematic')
  await page
    .getByRole('button', {
      name: 'Switch to immersive learning layout',
      exact: true,
    })
    .click()
  await expect(page.locator(learnCanvas)).toHaveAttribute(
    'data-vfx-quality',
    'cinematic',
  )

  await page.locator('.learn-header .visual-settings summary').click()
  await page
    .locator('.learn-header .visual-settings')
    .getByRole('button', { name: /^Calm/ })
    .click()
  await expect(page.locator(learnCanvas)).toHaveAttribute(
    'data-vfx-quality',
    'calm',
  )
  await page
    .getByRole('button', {
      name: 'Fleet Command Play the infrastructure game',
      exact: true,
    })
    .click()
  await expect(page.locator(gameCanvas)).toHaveAttribute(
    'data-vfx-quality',
    'calm',
  )
  expect(
    await page.locator(gameCanvas).evaluate((el, old) => el === old, original),
  ).toBe(true)
  await page.reload()
  await expect(page.locator(gameCanvas)).toHaveAttribute(
    'data-vfx-quality',
    'calm',
  )
  expect(errors).toEqual([])
})

test('learning missions award persistent stars only after actual budget and performance requirements are satisfied', async ({
  page,
}) => {
  test.setTimeout(70000)
  await lab(page)
  await page.getByRole('button', { name: /Hold the traffic spike/ }).click()
  await page
    .getByRole('button', { name: 'Check my solution', exact: true })
    .click()
  await expect(page.locator('.challenge-result')).toContainText(
    'Keep iterating',
  )
  await page.getByRole('button', { name: /Continuous batching/ }).click()
  await page
    .getByRole('slider', { name: 'Reusable prompt prefix', exact: true })
    .fill('80')
  await page
    .getByRole('button', { name: 'Check my solution', exact: true })
    .click()
  await expect(page.locator('.challenge-result')).toContainText(
    'Design validated',
  )
  await expect(page.locator('.challenge-result')).toContainText(
    '3 stars recorded',
  )
  await expect(page.locator('.challenge-toggle')).toContainText('300 XP')
  await page
    .getByRole('slider', { name: 'Modeled GPUs', exact: true })
    .fill('100000')
  await page
    .getByRole('button', { name: 'Check my solution', exact: true })
    .click()
  await expect(page.locator('.challenge-result')).toContainText(
    'Keep iterating',
  )
  await page.reload()
  await page.getByRole('button', { name: /Learn by solving/ }).click()
  await expect(page.locator('.challenge-toggle')).toContainText('300 XP')
})

test('long-context and split-pool missions connect the challenge to the correct 3D state and accept valid solutions', async ({
  page,
}) => {
  test.setTimeout(90000)
  await lab(page)
  await page.getByRole('button', { name: /Give context a home/ }).click()
  await expect(page.locator(learnCanvas)).toHaveAttribute(
    'data-motion-mode',
    'kv',
  )
  await expect(page.locator(learnCanvas)).toHaveAttribute(
    'data-motion-layer',
    'gpu',
  )
  await expect(page.locator('.challenge-checks')).toContainText('41 KV slots')
  await page
    .getByRole('slider', { name: 'Active batch limit', exact: true })
    .fill('32')
  await page
    .getByRole('button', { name: 'Check my solution', exact: true })
    .click()
  await expect(page.locator('.challenge-result')).toContainText(
    'Design validated',
  )
  await page.getByRole('button', { name: /Balance the two pools/ }).click()
  await page
    .getByRole('slider', { name: 'Prefill pool allocation', exact: true })
    .fill('65')
  await page
    .getByRole('button', { name: 'Check my solution', exact: true })
    .click()
  await expect(page.locator('.challenge-result')).toContainText(
    'Design validated',
  )
  await page.getByRole('button', { name: /Unblock the state handoff/ }).click()
  await page
    .getByRole('slider', { name: 'Fabric endpoint', exact: true })
    .fill('400')
  await page
    .getByRole('button', { name: 'Check my solution', exact: true })
    .click()
  await expect(page.locator('.challenge-result')).toContainText(
    'Design validated',
  )
})

test('mobile visual controls and operations remain reachable without covering navigation or extending the viewport', async ({
  page,
}) => {
  test.setTimeout(70000)
  await page.setViewportSize({ width: 320, height: 720 })
  await sandbox(page)
  await page.locator('.game-header .visual-settings summary').click()
  let popup = await page
    .locator('.game-header .visual-settings > div')
    .boundingBox()
  expect(popup!.x).toBeGreaterThanOrEqual(0)
  expect(popup!.x + popup!.width).toBeLessThanOrEqual(320)
  await page.keyboard.press('Escape')
  await expect(
    page.locator('.game-header .visual-settings'),
  ).not.toHaveAttribute('open')
  await page
    .getByRole('button', { name: 'Open operations research', exact: true })
    .click()
  await page
    .getByRole('combobox', { name: 'Queue scheduling policy', exact: true })
    .selectOption('shortest')
  await page
    .getByRole('button', { name: 'Close command drawer', exact: true })
    .click()
  await page.getByRole('button', { name: 'Learning mode', exact: true }).click()
  await page.locator('.learn-header .visual-settings summary').click()
  popup = await page
    .locator('.learn-header .visual-settings > div')
    .boundingBox()
  expect(popup!.x).toBeGreaterThanOrEqual(0)
  expect(popup!.x + popup!.width).toBeLessThanOrEqual(320)
  const layout = await page.evaluate(() => {
    const nav = document
        .querySelector('.learn-header nav')!
        .getBoundingClientRect(),
      tools = document
        .querySelector('.learn-header-tools')!
        .getBoundingClientRect()
    return {
      overflow: document.documentElement.scrollWidth > innerWidth,
      overlap: nav.right > tools.left,
    }
  })
  expect(layout.overflow).toBe(false)
  expect(layout.overlap).toBe(false)
})

test('reduced-motion 2D fallback retains the operations model, reserve and learning missions', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.addInitScript(() => {
    const get = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (
      type: string,
      ...args: unknown[]
    ) {
      return type.includes('webgl')
        ? null
        : get.call(this, type as '2d', ...(args as []))
    } as typeof get
  })
  await sandbox(page)
  await page.getByRole('button', { name: 'Game menu', exact: true }).click()
  const menu = page.getByRole('dialog', {
    name: 'Mission control',
    exact: true,
  })
  await menu
    .getByRole('combobox', { name: 'Queue scheduling policy', exact: true })
    .selectOption('deadline')
  await menu
    .getByRole('button', { name: 'Activate capacity surge', exact: true })
    .click()
  await expect(
    menu.getByRole('meter', { name: 'Reserve energy', exact: true }),
  ).toHaveAttribute('aria-valuenow', '40')
  await page
    .getByRole('button', { name: 'Close game dialog', exact: true })
    .click()
  await page.getByRole('button', { name: 'Learning mode', exact: true }).click()
  await page.getByRole('button', { name: 'Trade-off lab', exact: true }).click()
  await page.getByRole('button', { name: /Learn by solving/ }).click()
  await page.getByRole('button', { name: /Unblock the state handoff/ }).click()
  await page
    .getByRole('slider', { name: 'Fabric endpoint', exact: true })
    .fill('400')
  await page
    .getByRole('button', { name: 'Check my solution', exact: true })
    .click()
  await expect(page.locator('.challenge-result')).toContainText(
    'Design validated',
  )
})

test('a reserve can be activated from a selected world module without opening an operations dashboard', async ({
  page,
}) => {
  await sandbox(page)
  await page
    .getByRole('button', { name: 'Sector B1: Prefill engine', exact: true })
    .click()
  await page
    .getByRole('button', { name: 'Surge selected module', exact: true })
    .click()
  await expect(page.locator('.fusion-unit-reserve')).toContainText(
    'Reserve active · 6.0s',
  )
  await expect(page.locator('.fusion-unit-reserve')).toContainText(
    '1.75× effective compute',
  )
  await expect(
    page.getByRole('button', { name: 'Surge selected module', exact: true }),
  ).toBeDisabled()
})
