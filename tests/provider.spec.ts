import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

const root = '.campaign-game',
  world = '.campaign-world canvas'
async function open(page: Page) {
  await page.goto('./?scenario=cloud-provider')
  await expect(page.locator(root)).toHaveAttribute(
    'data-scenario',
    'cloud-provider',
  )
  await expect(
    page.getByRole('complementary', { name: 'Cloud capacity workshop' }),
  ).toBeVisible()
}
async function level(page: Page, index: number) {
  await page
    .getByRole('button', {
      name: `${index + 1} ${['Fleet', 'Pod', 'Server', 'GPU'][index]} game level`,
      exact: true,
    })
    .click()
}
async function policies(page: Page) {
  const options = [
    ['Fair quota + idle borrowing', 'Protect eight burst GPUs'],
    ['Weighted transfer queues', 'Scoped local artifact cache'],
    ['Pack replicas; preserve gangs', 'Checkpoint before release'],
    ['VM + dedicated GPU leases', 'Use approved memory envelope'],
  ]
  for (let i = 0; i < 4; i++) {
    await level(page, i)
    for (const option of options[i]) {
      const button = page.getByRole('button', {
        name: `Install ${option}`,
        exact: true,
      })
      await button.click()
      await expect(button).toHaveAttribute('aria-pressed', 'true')
    }
    if (i === 2)
      await page
        .getByRole('button', {
          name: 'Run rolling placement plan',
          exact: true,
        })
        .click()
  }
}
async function fast(page: Page) {
  await page
    .getByRole('button', { name: 'Change cloud simulation speed', exact: true })
    .click()
  await page
    .getByRole('button', { name: 'Change cloud simulation speed', exact: true })
    .click()
}
test('cloud and model roles share one physical canvas, preserve runs, and expose actual four-scale device claims', async ({
  page,
}) => {
  await page.goto('./')
  await page
    .getByRole('button', { name: 'Explore freely', exact: true })
    .click()
  const canvas = await page.locator(world).elementHandle()
  await page
    .getByLabel('Game scenario', { exact: true })
    .selectOption('cloud-provider')
  await expect(page.locator(root)).toHaveAttribute(
    'data-scenario',
    'cloud-provider',
  )
  await expect(page.locator(world)).toHaveAttribute(
    'data-context-id',
    'cloud-provider',
  )
  for (let i = 0; i < 4; i++) {
    await level(page, i)
    await expect(page.locator(world)).toHaveAttribute(
      'data-motion-layer',
      ['fleet', 'pod', 'rack', 'gpu'][i],
    )
    await expect(page.locator(world)).toHaveAttribute(
      'data-context-glyphs',
      String([64, 32, 8, 32][i]),
    )
    expect(
      await page.locator(world).evaluate((el, old) => el === old, canvas),
    ).toBe(true)
  }
  await page
    .getByRole('button', { name: 'Run cloud shift', exact: true })
    .click()
  await expect
    .poll(async () =>
      Number(await page.locator(root).getAttribute('data-time')),
    )
    .toBeGreaterThan(0.5)
  await page.getByLabel('Game scenario', { exact: true }).selectOption('model')
  await expect(page.locator(root)).toHaveAttribute('data-scenario', 'model')
  await expect(page.locator(world)).toHaveAttribute(
    'data-context-id',
    /^pretrain:/,
  )
  await page
    .getByLabel('Game scenario', { exact: true })
    .selectOption('cloud-provider')
  await expect(page.locator(root)).toHaveAttribute('data-status', 'paused')
  const time = await page.locator(root).getAttribute('data-time')
  await page.waitForTimeout(400)
  await expect(page.locator(root)).toHaveAttribute('data-time', time!)
  expect(
    await page.locator(world).evaluate((el, old) => el === old, canvas),
  ).toBe(true)
})
test('cloud policies execute a real rolling plan, transfer bytes, finish customer work and meet peak readiness', async ({
  page,
}) => {
  test.setTimeout(120000)
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await open(page)
  await policies(page)
  await expect(page.locator(root)).toHaveAttribute('data-contracts', '0')
  await fast(page)
  await page
    .getByRole('button', { name: 'Run cloud shift', exact: true })
    .click()
  await expect
    .poll(() => page.locator(world).getAttribute('data-context-progress'))
    .not.toBe('0')
  await expect(
    page.getByRole('region', {
      name: 'Cloud provider shift complete',
      exact: true,
    }),
  ).toBeVisible({ timeout: 45000 })
  await expect(page.locator(root)).toHaveAttribute('data-status', 'won')
  await expect(page.locator(root)).toHaveAttribute('data-contracts', '4')
  const recap = page.getByRole('region', {
    name: 'Learning recap',
    exact: true,
  })
  await expect(recap).toContainText(
    'High occupancy alone does not prove useful work.',
  )
  await recap
    .getByRole('button', {
      name: 'The slots may be fragmented across incompatible local domains.',
      exact: true,
    })
    .click()
  await expect(recap.getByRole('status')).toContainText('That is the key idea.')
  await page.screenshot({
    path: test.info().outputPath('cloud-game-recap.png'),
  })
  await expect(page.locator(root)).toHaveAttribute('data-contracts', '4')
  expect(
    Number(await page.locator(root).getAttribute('data-training-jobs')),
  ).toBeGreaterThanOrEqual(2)
  expect(
    Number(await page.locator(root).getAttribute('data-tuning-jobs')),
  ).toBeGreaterThanOrEqual(2)
  expect(
    Number(await page.locator(root).getAttribute('data-produced')),
  ).toBeGreaterThanOrEqual(128)
  await expect(page.locator('.provider-capacity-note')).toContainText(
    'to peak readiness',
  )
  expect(errors).toEqual([])
})
test('mobile cloud controls, research dialog and camera remain accessible with reduced motion', async ({
  page,
}) => {
  test.setTimeout(120000)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await open(page)
  for (const size of [
    { width: 390, height: 844 },
    { width: 390, height: 480 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(size)
    await level(page, 3)
    await page
      .getByRole('button', {
        name: 'Install Use approved memory envelope',
        exact: true,
      })
      .click()
    await expect(
      page.getByRole('button', { name: 'Run cloud shift', exact: true }),
    ).toBeInViewport()
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true)
  }
  await page.setViewportSize({ width: 390, height: 844 })
  await page
    .getByRole('button', { name: 'Cloud scenario research', exact: true })
    .click()
  const dialog = page.getByRole('dialog', {
    name: 'Cloud provider research and assumptions',
    exact: true,
  })
  await expect(dialog).toBeVisible()
  await expect(
    dialog.getByRole('link', { name: /NVIDIA · GPU time-slicing/ }),
  ).toHaveAttribute('href', /gpu-sharing/)
  await expect(dialog).toContainText('320/8+16=56')
  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()
  await page
    .getByRole('button', { name: 'Hide cloud workshop', exact: true })
    .click()
  await page
    .getByRole('button', { name: 'Cloud view from above', exact: true })
    .click()
  await expect(page.locator(world)).toHaveAttribute('data-camera-view', 'top')
  await page
    .getByRole('button', { name: 'Show cloud workshop', exact: true })
    .click()
  await expect(
    page.getByRole('complementary', { name: 'Cloud capacity workshop' }),
  ).toBeVisible()
})
test('cloud simulation still completes when WebGL is unavailable', async ({
  page,
}) => {
  test.setTimeout(120000)
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (
      ...args: Parameters<typeof original>
    ) {
      if (String(args[0]).startsWith('webgl')) return null
      return original.apply(this, args)
    } as typeof original
  })
  await open(page)
  await expect(
    page.getByTestId('campaign-scene').locator('.fallback-topology'),
  ).toBeVisible()
  await policies(page)
  await fast(page)
  await page
    .getByRole('button', { name: 'Run cloud shift', exact: true })
    .click()
  await expect(
    page.getByRole('region', {
      name: 'Cloud provider shift complete',
      exact: true,
    }),
  ).toBeVisible({ timeout: 30000 })
})
