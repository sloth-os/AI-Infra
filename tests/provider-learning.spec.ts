import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import { level, noWebGL } from './connected-helpers'
const world = '.learning-world canvas',
  root = '.learning-fusion'
async function open(page: Page, extra = '') {
  await page.goto(`./?view=explore&provider=cloud&${extra}`)
  await expect(page.getByTestId('cloud-provider-study')).toBeVisible()
}
async function seek(page: Page, value: string) {
  await page
    .getByRole('slider', { name: 'Cloud replay time', exact: true })
    .fill(value)
}
test('paused cloud hardware stays visible after a responsive resize while settled frames rest the GPU', async ({
  page,
}) => {
  await open(page, 'level=server&cp_time=12')
  await expect(page.locator(world)).toHaveAttribute(
    'data-world-settled',
    'true',
  )
  // Capture a composed desktop frame, then resize the same sleeping WebGL canvas.
  await page.screenshot()
  await page
    .getByRole('button', { name: 'Hide connected details', exact: true })
    .click()
  await page.setViewportSize({ width: 390, height: 844 })
  await page.waitForTimeout(700)
  const shot = await page.locator(world).screenshot({
    style:
      '.learning-fusion > :not(.learning-world), .learning-world .scene-label { visibility: hidden !important; }',
  })
  const bright = await page.evaluate(async (encoded) => {
    const bitmap = await createImageBitmap(
      await (await fetch(`data:image/png;base64,${encoded}`)).blob(),
    )
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height),
      context = canvas.getContext('2d')!
    context.drawImage(bitmap, 0, 0)
    const pixels = context.getImageData(0, 0, bitmap.width, bitmap.height).data
    let count = 0
    for (let i = 0; i < pixels.length; i += 16)
      if (pixels[i] + pixels[i + 1] + pixels[i + 2] > 180) count++
    bitmap.close()
    return count
  }, shot.toString('base64'))
  expect(bright).toBeGreaterThan(1000)
  await expect
    .poll(async () => {
      const before = Number(
        await page.locator(world).getAttribute('data-context-paints'),
      )
      await page.waitForTimeout(400)
      return (
        Number(await page.locator(world).getAttribute('data-context-paints')) -
        before
      )
    })
    .toBe(0)
})
test('cloud Learning discovery connects every physical level, keeps one canvas, and retains evidence and experiment state', async ({
  page,
}) => {
  test.setTimeout(120000)
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('./?view=explore')
  const canvas = await page.locator(world).elementHandle()
  await page
    .getByRole('button', { name: 'Browse stories at this level', exact: true })
    .click()
  await page
    .getByRole('button', {
      name: 'Explore scenario: Cloud provider',
      exact: true,
    })
    .click()
  await expect(page.locator(world)).toHaveAttribute(
    'data-context-kind',
    'provider',
  )
  await seek(page, '12')
  for (const [index, id] of ['fleet', 'pod', 'rack', 'gpu'].entries()) {
    await level(page, id)
    await expect(page.locator(world)).toHaveAttribute(
      'data-context-stage',
      String(index),
    )
    await expect(page.locator(world)).toHaveAttribute(
      'data-context-glyphs',
      String([64, 32, 8, 32][index]),
    )
    await expect(
      page.getByRole('slider', { name: 'Cloud replay time' }),
    ).toHaveValue('12')
    expect(
      await page.locator(world).evaluate((el, old) => el === old, canvas),
    ).toBe(true)
  }
  await page.getByRole('button', { name: 'Evidence', exact: true }).click()
  await expect(
    page
      .getByTestId('cloud-provider-study')
      .locator('.provider-learning-sources a'),
  ).toHaveCount(7)
  await expect(page.getByTestId('cloud-provider-study')).toContainText(
    '320/8+16=56',
  )
  await page
    .getByRole('button', { name: 'Service boundary', exact: true })
    .click()
  await expect(page.getByTestId('cloud-provider-study')).toContainText(
    'does not tokenize or decode',
  )
  await page
    .getByRole('button', {
      name: 'Follow pre-training inside the customer runtime',
      exact: true,
    })
    .click()
  await expect(page.locator(world)).toHaveAttribute(
    'data-context-kind',
    'lifecycle',
  )
  expect(
    await page.locator(world).evaluate((el, old) => el === old, canvas),
  ).toBe(true)
  expect(errors).toEqual([])
})
test('paired replay exposes actual completed work and policy-dependent failures at matched elapsed times', async ({
  page,
}) => {
  await open(page, 'level=gpu')
  const slider = page.getByRole('slider', { name: 'Cloud replay time' })
  await seek(page, (await slider.getAttribute('max'))!)
  const table = page.getByRole('table', {
    name: 'Matched-time cloud performance comparison',
  })
  await expect(
    table
      .getByRole('row', { name: /^Training jobs committed/ })
      .locator('td')
      .nth(0),
  ).toHaveText('0')
  expect(
    Number(
      await table
        .getByRole('row', { name: /^Training jobs committed/ })
        .locator('td')
        .nth(1)
        .textContent(),
    ),
  ).toBeGreaterThanOrEqual(2)
  await expect(
    table
      .getByRole('row', { name: /^Runtime OOM events/ })
      .locator('td')
      .nth(1),
  ).toHaveText('0')
  const allocation = page.getByRole('group', {
    name: 'Replay visible allocation',
  })
  await allocation
    .getByRole('button', { name: 'Baseline', exact: true })
    .click()
  await expect(page.getByTestId('cloud-provider-study')).toHaveAttribute(
    'data-side',
    'baseline',
  )
  const comparisonTime = await slider.inputValue()
  await page
    .getByRole('checkbox', {
      name: 'Cloud policy: Use approved memory envelope',
      exact: true,
    })
    .uncheck()
  await expect(slider).toHaveValue(comparisonTime)
  await seek(page, '12')
  expect(
    Number(
      await table
        .getByRole('row', { name: /^Runtime OOM events/ })
        .locator('td')
        .nth(1)
        .textContent(),
    ),
  ).toBeGreaterThan(0)
  await expect(
    table
      .getByRole('row', { name: /^Tuning jobs committed/ })
      .locator('td')
      .nth(1),
  ).toHaveText('0')
})
test('cloud replay play/pause, camera, sharing and cinema use the comparison clock while preserving the reference clock', async ({
  page,
}) => {
  test.setTimeout(120000)
  await open(page, 'level=server')
  const baseTime = await page
    .getByTestId('infrastructure-scene')
    .getAttribute('data-motion-time')
  await page
    .getByRole('combobox', { name: 'Cloud replay speed' })
    .selectOption('4')
  await page
    .getByRole('button', { name: 'Play connected walkthrough', exact: true })
    .click()
  await expect
    .poll(async () =>
      Number(await page.locator(root).getAttribute('data-provider-time')),
    )
    .toBeGreaterThan(2)
  await page
    .getByRole('button', { name: 'Pause connected walkthrough', exact: true })
    .click()
  const paused = await page.locator(root).getAttribute('data-provider-time')
  await page.waitForTimeout(300)
  await expect(page.locator(root)).toHaveAttribute(
    'data-provider-time',
    paused!,
  )
  await expect(page.getByTestId('infrastructure-scene')).toHaveAttribute(
    'data-motion-time',
    baseTime!,
  )
  await expect(page.locator(world)).toHaveAttribute('data-motion-layer', 'rack')
  await page
    .getByRole('button', { name: 'Share cloud provider lesson' })
    .click()
  await expect(page).toHaveURL(/provider=cloud/)
  await expect(page).toHaveURL(/cp_time=/)
  await page.reload()
  await expect(page.locator(root)).toHaveAttribute(
    'data-provider-playing',
    'false',
  )
  expect(
    Number(await page.locator(root).getAttribute('data-provider-time')),
  ).toBeGreaterThan(2)
  await page
    .getByRole('button', { name: 'Hide connected details', exact: true })
    .click()
  await page.getByRole('button', { name: 'Top down', exact: true }).click()
  await expect(page.locator(world)).toHaveAttribute('data-camera-view', 'top')
  await page.keyboard.press('h')
  await expect(
    page.getByRole('button', { name: /Show learning controls/ }),
  ).toBeVisible()
  await page.keyboard.press('h')
  await expect(
    page.getByRole('slider', { name: 'Cloud replay time' }),
  ).toBeVisible()
})
test('cloud Game opens its Learning story and the story can return to the retained cloud game at the same scale', async ({
  page,
}) => {
  await page.goto('./?scenario=cloud-provider&gameLevel=server')
  await page.getByRole('button', { name: 'Learning mode', exact: true }).click()
  await expect(page.getByTestId('cloud-provider-study')).toBeVisible()
  await expect(page.locator(world)).toHaveAttribute('data-motion-layer', 'rack')
  await page
    .getByRole('checkbox', {
      name: 'Cloud policy: Checkpoint before release',
      exact: true,
    })
    .uncheck()
  await seek(page, '7')
  await page
    .getByRole('button', {
      name: 'Play the Cloud provider game scenario',
      exact: true,
    })
    .click()
  await expect(page.locator('.campaign-game')).toHaveAttribute(
    'data-scenario',
    'cloud-provider',
  )
  await expect(page.locator('.campaign-game')).toHaveAttribute(
    'data-level',
    'rack',
  )
  await expect(
    page.getByRole('complementary', { name: 'Cloud capacity workshop' }),
  ).toBeVisible()
  await page
    .getByRole('button', { name: 'Run cloud shift', exact: true })
    .click()
  await expect
    .poll(async () =>
      Number(await page.locator('.campaign-game').getAttribute('data-time')),
    )
    .toBeGreaterThan(0.5)
  await page
    .getByRole('button', { name: 'Pause cloud shift', exact: true })
    .click()
  await expect(page.locator('.campaign-game')).toHaveAttribute(
    'data-status',
    'paused',
  )
  const gameTime = await page
    .locator('.campaign-game')
    .getAttribute('data-time')
  await page.getByRole('button', { name: 'Learning mode', exact: true }).click()
  await expect(
    page.getByRole('slider', { name: 'Cloud replay time' }),
  ).toHaveValue('7')
  await expect(
    page.getByRole('checkbox', {
      name: 'Cloud policy: Checkpoint before release',
      exact: true,
    }),
  ).not.toBeChecked()
  await expect(page.locator('.campaign-game')).toHaveAttribute(
    'data-time',
    gameTime!,
  )
})
test('mobile, reduced motion and physical-topology fallback retain scrubbing, policies and source access', async ({
  page,
}) => {
  test.setTimeout(120000)
  await noWebGL(page)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width: 390, height: 844 })
  await open(page)
  await expect(
    page.getByTestId('infrastructure-scene').locator('.fallback-topology'),
  ).toBeVisible()
  await expect(
    page.getByRole('button', {
      name: 'Play connected walkthrough',
      exact: true,
    }),
  ).toBeDisabled()
  for (const size of [
    { width: 390, height: 844 },
    { width: 390, height: 480 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(size)
    const gpuLevel = page
      .getByRole('navigation', { name: 'Infrastructure scale' })
      .getByRole('button', { name: /^4 GPU / })
    await gpuLevel.click()
    await expect(gpuLevel).toHaveAttribute('aria-pressed', 'true')
    const slider = page.getByRole('slider', {
      name: 'Cloud replay time',
      exact: true,
    })
    await expect(slider).toBeInViewport()
    const box = await slider.boundingBox()
    expect(box!.width).toBeGreaterThan(45)
    await seek(page, '12')
    await page
      .getByRole('checkbox', {
        name: 'Cloud policy: VM + dedicated GPU leases',
        exact: true,
      })
      .uncheck()
    await expect(slider).toHaveValue('12')
    await page
      .getByRole('checkbox', {
        name: 'Cloud policy: VM + dedicated GPU leases',
        exact: true,
      })
      .check()
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true)
  }
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: 'Evidence', exact: true }).click()
  await expect(
    page
      .getByTestId('cloud-provider-study')
      .getByRole('link', { name: /NVIDIA · GPU time-slicing/ }),
  ).toHaveAttribute('href', /gpu-sharing/)
})
