import { test, expect } from '@playwright/test'

test('motion lenses preserve the WebGL canvas and make a transformer pass seekable', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('/')
  await expect(page.locator('canvas')).toHaveCount(1)
  const canvas = await page.locator('canvas').elementHandle()
  await page.getByRole('button', { name: 'Tensor flow', exact: true }).click()
  await page
    .getByRole('button', { name: /Animation chapter 4: Attend/ })
    .click()
  await expect(page.locator('.motion-telemetry')).toContainText(
    'Attend only to allowed past positions',
  )
  await expect(page.locator('.motion-chapter-explanation')).toContainText(
    'upper triangle stays dark',
  )
  await expect(
    page.getByRole('slider', { name: 'Animation timeline' }),
  ).toHaveValue('18')
  await page
    .getByRole('button', { name: 'Explode hardware', exact: true })
    .click()
  await expect(
    page.getByRole('button', { name: 'Explode hardware', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Top down', exact: true }).click()
  await page.getByRole('slider', { name: 'Animation timeline' }).fill('48')
  await expect(page.locator('.motion-telemetry')).toContainText(
    'Sample, emit, and feed the next iteration',
  )
  await page.getByRole('button', { name: 'Inspect data', exact: true }).click()
  await expect(
    page.getByRole('complementary', { name: 'Inspected data parcel' }),
  ).toContainText('BF16 vectors')
  await page.getByRole('button', { name: 'Close payload inspection' }).click()
  expect(
    await page.evaluate(
      (el) => el === document.querySelector('canvas'),
      canvas,
    ),
  ).toBe(true)
  expect(errors).toEqual([])
})

test('KV motion uses per-rank sizes and responds to endpoint bandwidth', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'KV cache', exact: true }).click()
  await page
    .getByRole('button', { name: /Animation chapter 3: Move eight/ })
    .click()
  await expect(page.locator('.motion-telemetry')).toContainText('640 MiB')
  await page
    .getByRole('combobox', { name: '3D fabric bandwidth' })
    .selectOption('25')
  await expect(page.locator('.motion-telemetry')).toContainText('307 ms')
  await page.getByRole('button', { name: 'Inspect data', exact: true }).click()
  await expect(
    page.getByRole('complementary', { name: 'Inspected data parcel' }),
  ).toContainText('640 MiB total · 80.0 MiB / rank')
  await page.getByRole('button', { name: 'Close payload inspection' }).click()
  await page.getByRole('button', { name: /04 GPU 1 GPU/ }).click()
  await page.getByRole('slider', { name: 'Animation timeline' }).fill('24')
  await expect(page.locator('.motion-telemetry')).toContainText('KV / RANK')
  await expect(page.locator('.motion-telemetry')).toContainText('80 MiB')
  await page.getByRole('button', { name: 'Inspect data', exact: true }).click()
  await expect(
    page.getByRole('complementary', { name: 'Inspected data parcel' }),
  ).toContainText('HBM ↔ on-chip working memory')
  await expect(
    page.getByRole('complementary', { name: 'Inspected data parcel' }),
  ).toContainText('80.0 MiB retained per rank')
})

test('pause holds the timeline and guided flight follows chapters across scales', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Guided flight', exact: true }).click()
  await page.getByRole('slider', { name: 'Animation timeline' }).fill('29')
  await expect(
    page.getByRole('heading', { name: 'The scale-out fabric', exact: true }),
  ).toBeVisible()
  await expect(page.locator('.scene-topline h3')).toContainText('5,000 GPUs')
  await expect(
    page.getByRole('button', { name: 'Play timeline', exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('slider', { name: 'Animation timeline' }),
  ).toHaveValue('29')
  await page.waitForTimeout(500)
  await expect(
    page.getByRole('slider', { name: 'Animation timeline' }),
  ).toHaveValue('29')
  await page.getByRole('button', { name: 'Collectives', exact: true }).click()
  await page.getByRole('slider', { name: 'Animation timeline' }).fill('48')
  await expect(page.locator('.motion-telemetry')).toContainText('14 / 14')
  await expect(
    page.locator('.scene-label').filter({ hasText: '8/8 chunks complete' }),
  ).toHaveCount(8)
})

test('reduced-motion users can scrub and mobile controls fit the viewport', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await expect(
    page.getByRole('slider', { name: 'Animation timeline' }),
  ).toHaveValue('0')
  await page.getByRole('button', { name: 'Tensor flow', exact: true }).click()
  await page.getByRole('button', { name: /Animation chapter 6:/ }).click()
  await expect(page.locator('.motion-telemetry')).toContainText(
    'Transform features with a gated MLP',
  )
  await page
    .getByRole('button', { name: 'Explode hardware', exact: true })
    .click()
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
})
