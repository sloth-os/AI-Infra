import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
const root = '.campaign-game',
  world = '.campaign-world canvas'
const names = ['Fleet', 'Pod', 'Server', 'GPU']
async function open(page: Page, phase = 'pretrain') {
  await page.goto(`/?campaign=lifecycle&operation=${phase}`)
  await expect(page.locator(root)).toBeVisible()
  await expect(page.locator(world)).toHaveAttribute(
    'data-world-kind',
    'infrastructure',
  )
}
async function level(page: Page, index: number) {
  await page
    .getByRole('button', {
      name: `${index + 1} ${names[index]} game level`,
      exact: true,
    })
    .click()
  await expect(page.locator(root)).toHaveAttribute(
    'data-level',
    ['fleet', 'pod', 'rack', 'gpu'][index],
  )
}
async function choose(page: Page, title: string, option: string) {
  const button = page.getByRole('button', {
    name: `Set ${title}: ${option}`,
    exact: true,
  })
  await button.click()
  await expect(button).toHaveAttribute('aria-pressed', 'true')
}
async function fast(page: Page) {
  await page
    .getByRole('button', { name: 'Change operation speed', exact: true })
    .click()
  await page
    .getByRole('button', { name: 'Change operation speed', exact: true })
    .click()
}
async function start(page: Page) {
  await page.getByRole('button', { name: /^(Start|Resume) operation$/ }).click()
}
async function readyInference(page: Page) {
  await level(page, 0)
  await choose(page, 'Tenant-aware prefix routing', 'Route to warm ownership')
  await level(page, 1)
  await choose(page, 'Prefill / decode scheduling', 'Chunked prefill')
  await level(page, 2)
  await choose(page, 'Decode slot scheduling', 'Continuous batching')
  await choose(page, 'Sequences per replica', '32 sequences')
  await level(page, 3)
  await choose(page, 'Attention memory path', 'Tiled attention')
}
test('the default game covers three lifecycle phases at all four physical levels on one persistent canvas', async ({
  page,
}) => {
  test.setTimeout(180000)
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('/')
  await page
    .getByRole('button', { name: 'Explore freely', exact: true })
    .click()
  await expect(
    page.getByRole('region', { name: 'AI lifecycle campaign', exact: true }),
  ).toBeVisible()
  const original = await page.locator(world).elementHandle(),
    hardware: Record<string, string> = {}
  for (const [phase, title] of [
    ['pretrain', 'Pre-training'],
    ['posttrain', 'Post-training'],
    ['inference', 'Inference'],
  ]) {
    await page
      .getByRole('navigation', { name: 'Game lifecycle phases' })
      .getByRole('button', { name: new RegExp(title) })
      .click()
    for (let i = 0; i < 4; i++) {
      await level(page, i)
      await expect(page.locator(world)).toHaveAttribute(
        'data-motion-layer',
        ['fleet', 'pod', 'rack', 'gpu'][i],
      )
      await expect(page.locator(world)).toHaveAttribute(
        'data-context-id',
        new RegExp(`^${phase}:`),
      )
      const count = await page
        .locator(world)
        .getAttribute('data-hardware-instances')
      if (hardware[i]) expect(count).toBe(hardware[i])
      else hardware[i] = count!
      expect(
        await page.locator(world).evaluate((el, old) => el === old, original),
      ).toBe(true)
      await expect(
        page.getByRole('complementary', { name: 'Level performance workshop' }),
      ).toBeVisible()
    }
    await expect(page.locator(root)).toHaveAttribute('data-produced', '0')
  }
  expect(errors).toEqual([])
})
test('actual inference work verifies all four performance contracts, drives animation progress and saves earned medals', async ({
  page,
}) => {
  test.setTimeout(130000)
  await open(page, 'inference')
  await readyInference(page)
  await expect(page.locator(root)).toHaveAttribute('data-produced', '0')
  await expect(
    page.getByRole('group', { name: 'Attention memory path' }),
  ).toContainText('ACTIVE')
  await fast(page)
  await start(page)
  await expect(page.locator(root)).toHaveAttribute('data-status', 'running')
  await expect
    .poll(() => page.locator(world).getAttribute('data-context-progress'))
    .not.toBe('0')
  await expect(
    page.getByRole('region', { name: 'Lifecycle operation complete' }),
  ).toBeVisible({ timeout: 60000 })
  await expect(page.locator(root)).toHaveAttribute('data-produced', '64')
  const recap = page.getByRole('region', {
    name: 'Learning recap',
    exact: true,
  })
  await expect(recap).toContainText('64 requests delivered')
  await recap
    .getByRole('button', { name: 'It roughly doubles.', exact: true })
    .click()
  await expect(recap.getByRole('status')).toContainText('That is the key idea.')
  await page.screenshot({ path: test.info().outputPath('lifecycle-recap.png') })
  await expect(page.locator(root)).toHaveAttribute('data-produced', '64')
  expect(
    await page.evaluate(
      () =>
        Object.keys(
          JSON.parse(
            localStorage.getItem('strata-lifecycle-campaign-v1') || '{}',
          ),
        ).filter((key) => key.startsWith('inference:')).length,
    ),
  ).toBe(4)
  await page.reload()
  await expect(page.locator(root)).toHaveAttribute('data-produced', '0')
  await expect(
    page.getByRole('navigation', { name: 'Game lifecycle phases' }),
  ).toContainText('4/4')
})
test('pre-training must fix actual residency before it can finish updates, then earns every level through completed work', async ({
  page,
}) => {
  test.setTimeout(150000)
  await open(page)
  await start(page)
  await expect(page.locator(root)).toHaveAttribute('data-status', 'running')
  await expect(page.locator('.campaign-admission-notice')).toContainText(
    'HBM blocked',
    { useInnerText: true },
  )
  await page.getByRole('button', { name: 'Explain HBM', exact: true }).click()
  await expect(page.locator(root)).toHaveAttribute('data-status', 'paused')
  await expect(
    page.locator('.experience-term-popover:popover-open'),
  ).toContainText('High-bandwidth memory')
  await page.keyboard.press('Escape')
  await expect(page.locator(root)).toHaveAttribute('data-produced', '0')
  await level(page, 2)
  await choose(page, 'Training state ownership', 'ZeRO-2')
  await choose(page, 'Pipeline schedule', '8 microbatches')
  await expect(page.locator('.campaign-admission-notice')).toHaveCount(0)
  await level(page, 0)
  await choose(page, 'Training data packing', 'Pack and prefetch')
  await level(page, 3)
  await choose(page, 'Attention execution', 'Tiled, fused attention')
  await fast(page)
  await start(page)
  await expect
    .poll(
      async () => Number(await page.locator(root).getAttribute('data-cycles')),
      { timeout: 50000 },
    )
    .toBeGreaterThanOrEqual(1)
  await page
    .getByRole('button', { name: 'Pause operation', exact: true })
    .click()
  await level(page, 1)
  await choose(page, 'Collective fabric', '400 Gb/s')
  await start(page)
  await expect(
    page.getByRole('region', { name: 'Lifecycle operation complete' }),
  ).toBeVisible({ timeout: 60000 })
  await expect(page.locator('.campaign-result')).toContainText(
    '4/4 contracts verified',
  )
})
test('post-training rejects an invalid objective and completes only after valid state, signal, versions and roles are configured', async ({
  page,
}) => {
  test.setTimeout(150000)
  await open(page, 'posttrain')
  await level(page, 2)
  await choose(page, 'Trainable state', 'LoRA rank 16')
  await fast(page)
  await start(page)
  await expect
    .poll(
      async () =>
        Number(await page.locator(root).getAttribute('data-rejected')),
      { timeout: 40000 },
    )
    .toBeGreaterThan(0)
  await expect(page.locator(root)).toHaveAttribute('data-produced', '0')
  await level(page, 3)
  await choose(
    page,
    'Validate the learning signal',
    'Validate objective inputs',
  )
  await expect(page.locator('.campaign-objective-readout')).toContainText('-1.')
  await level(page, 0)
  await choose(
    page,
    'Versioned work admission',
    'Validate and publish versions',
  )
  await choose(page, 'Sample supply', 'Pack valid examples')
  await level(page, 1)
  await choose(page, 'Rollout / learner allocation', '4 rollout / 4 learner')
  await start(page)
  await expect(
    page.getByRole('region', { name: 'Lifecycle operation complete' }),
  ).toBeVisible({ timeout: 60000 })
  await expect(page.locator(root)).toHaveAttribute('data-produced', '2')
})
test('phase changes, serving district and Learning mode round trips retain paused campaign configuration and the exact hardware canvas', async ({
  page,
}) => {
  test.setTimeout(120000)
  await open(page, 'inference')
  await level(page, 2)
  await choose(page, 'Decode slot scheduling', 'Continuous batching')
  const original = await page.locator(world).elementHandle()
  await page
    .getByRole('navigation', { name: 'Game lifecycle phases' })
    .getByRole('button', { name: /Post-training/ })
    .click()
  await page
    .getByRole('combobox', { name: 'Post-training game method' })
    .selectOption('dpo')
  await level(page, 1)
  await expect(
    page.getByRole('button', {
      name: 'Set Rollout / learner allocation: 4 rollout / 4 learner',
      exact: true,
    }),
  ).toBeDisabled()
  await expect(page.locator('.campaign-roles')).toContainText(
    'two frozen reference workers',
  )
  await level(page, 2)
  await expect(page.locator('.campaign-panel')).toContainText(
    'frozen-reference',
  )
  await page
    .getByRole('combobox', { name: 'Post-training game method' })
    .selectOption('sft')
  await expect(page.locator('.campaign-panel')).toContainText('Teacher-forced')
  await page
    .getByRole('navigation', { name: 'Game lifecycle phases' })
    .getByRole('button', { name: /Inference/ })
    .click()
  await expect(
    page.getByRole('button', {
      name: 'Set Decode slot scheduling: Continuous batching',
      exact: true,
    }),
  ).toHaveAttribute('aria-pressed', 'true')
  await page
    .getByRole('button', { name: 'Campaign top down camera', exact: true })
    .click()
  await expect(page.locator(world)).toHaveAttribute('data-camera-view', 'top')
  await page.getByRole('button', { name: 'Learning mode', exact: true }).click()
  await expect(page.locator('.learning-fusion')).toBeVisible()
  await page
    .getByRole('button', { name: /Fleet Command Play the infrastructure game/ })
    .click()
  await expect(page.locator(root)).toHaveAttribute('data-phase', 'inference')
  await expect(page.locator(root)).toHaveAttribute('data-produced', '0')
  await page
    .getByRole('button', { name: 'Return to serving district', exact: true })
    .click()
  await expect(
    page.getByRole('button', { name: 'Start mission', exact: true }),
  ).toBeVisible()
  await page
    .getByRole('button', { name: 'Play AI lifecycle campaign', exact: true })
    .click()
  expect(
    await page.locator(world).evaluate((el, old) => el === old, original),
  ).toBe(true)
  await expect(
    page.getByRole('button', {
      name: 'Set Decode slot scheduling: Continuous batching',
      exact: true,
    }),
  ).toHaveAttribute('aria-pressed', 'true')
  await page
    .getByRole('button', { name: '3 Server game level', exact: true })
    .focus()
  await page.keyboard.press('1')
  await expect(page.locator(root)).toHaveAttribute('data-level', 'fleet')
  await page.keyboard.press('f')
  await expect(
    page.getByRole('button', {
      name: 'Follow work across levels',
      exact: true,
    }),
  ).toHaveAttribute('aria-pressed', 'true')
  await expect(
    page.getByRole('complementary', { name: 'Level performance workshop' }),
  ).toBeHidden()
  await page.keyboard.press('h')
  await expect(
    page.getByRole('complementary', { name: 'Level performance workshop' }),
  ).toBeVisible()
})
test('sources, short-screen controls, reduced motion and no-WebGL fallback retain the complete playable campaign', async ({
  page,
}) => {
  test.setTimeout(120000)
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
  await page.goto('/?campaign=lifecycle&operation=inference')
  await expect(page.locator('.campaign-world .fallback-topology')).toBeVisible()
  for (const [width, height] of [
    [390, 844],
    [320, 720],
    [390, 480],
    [844, 390],
  ]) {
    await page.setViewportSize({ width, height })
    const layout = () =>
      page.evaluate(() => {
        const b = (selector: string) =>
          document.querySelector(selector)!.getBoundingClientRect()
        return {
          overflow: document.documentElement.scrollWidth > innerWidth,
          dock: b('.campaign-dock').bottom <= innerHeight,
          panel: b('.campaign-panel').bottom < b('.campaign-dock').top,
          camera: b('.campaign-camera').bottom < b('.campaign-dock').top,
          phases:
            b('.campaign-header nav').right <= b('.campaign-header > div').left,
        }
      })
    await expect.poll(layout).toEqual({
      overflow: false,
      dock: true,
      panel: true,
      camera: true,
      phases: true,
    })
  }
  await page.setViewportSize({ width: 390, height: 844 })
  await page
    .getByRole('button', { name: 'Sources and model assumptions', exact: true })
    .click()
  const dialog = page.getByRole('dialog', {
    name: 'Campaign sources and assumptions',
    exact: true,
  })
  await expect(dialog.locator('a')).not.toHaveCount(0)
  await expect(dialog).toContainText('not GPU benchmarks')
  await page
    .getByRole('button', { name: 'Close campaign dialog', exact: true })
    .click()
  await readyInference(page)
  await fast(page)
  await start(page)
  await expect(
    page.getByRole('region', { name: 'Lifecycle operation complete' }),
  ).toBeVisible({ timeout: 40000 })
  await expect(page.locator(root)).toHaveAttribute('data-produced', '64')
})
