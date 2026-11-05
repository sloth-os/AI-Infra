import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

const canvas = '.learning-world canvas'
async function open(page: Page, id = 'kimi-k3', stage = 0) {
  await page.goto(`/?view=guide&learn=fusion&example=${id}&stage=${stage}`)
  await expect(page.locator('.model-scope h1')).toBeVisible()
  await expect(page.locator(canvas)).toHaveAttribute('data-example-model', id)
}
async function choose(page: Page, id: string) {
  await page
    .getByRole('combobox', { name: 'Select real model', exact: true })
    .selectOption(id)
  await expect(page.locator(canvas)).toHaveAttribute('data-example-model', id)
}
const nav = (page: Page) =>
  page.getByRole('navigation', { name: 'Learning workspace navigation' })

test('all six real examples use distinct source-backed pipelines in the persistent learning canvas', async ({
  page,
}) => {
  test.setTimeout(100000)
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('/?view=explore')
  const original = await page.locator(canvas).elementHandle()
  await page.getByRole('button', { name: 'Top down', exact: true }).click()
  await expect(page.locator(canvas)).toHaveAttribute('data-camera-view', 'top')
  await nav(page)
    .getByRole('button', { name: 'Real models', exact: true })
    .click()
  await expect(page.locator('.model-catalog-card')).toHaveCount(6)
  await page.getByRole('button', { name: /Moonshot AI.*Kimi K3/ }).click()
  await expect(
    page.getByRole('button', { name: 'Isometric view', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator(canvas)).toHaveAttribute(
    'data-camera-view',
    'isometric',
  )
  for (const [id, title] of [
    ['kimi-k3', 'Kimi K3'],
    ['qwen-image-21', 'Qwen-Image-2.1'],
    ['minimax-h3', 'MiniMax H3'],
    ['minimax-music-3', 'MiniMax Music 3.0'],
    ['personaplex', 'PersonaPlex 7B v1'],
    ['cosyvoice-2', 'CosyVoice 2'],
  ]) {
    await choose(page, id)
    await expect(page.locator('.model-scope h1')).toHaveText(title)
    await expect(page.locator('.learning-world .scene-label')).toHaveCount(6)
    await expect(page.locator('.learn-metrics')).toBeHidden()
    await expect(page.locator('.model-stage-dock button')).toHaveCount(6)
    expect(
      await page.locator(canvas).evaluate((el, old) => el === old, original),
    ).toBe(true)
  }
  expect(errors).toEqual([])
})

test('Qwen sizing controls change model-specific budgets and survive a shared URL without changing the dense lab', async ({
  page,
}) => {
  await open(page, 'qwen-image-21')
  await page.getByRole('button', { name: 'Data budgets', exact: true }).click()
  await page
    .getByRole('combobox', { name: 'Image resolution', exact: true })
    .selectOption('1024')
  await page
    .getByRole('slider', { name: 'Image inference steps', exact: true })
    .fill('20')
  await expect(page.locator('.model-world-readouts')).toContainText('4.00')
  await expect(page.locator('.model-world-readouts')).toContainText('0.50')
  await page.getByRole('button', { name: /Model stage 5:/ }).click()
  await page
    .getByRole('button', { name: 'Share model example', exact: true })
    .click()
  await expect(page).toHaveURL(/ex_resolution=1024/)
  await expect(page).toHaveURL(/stage=4/)
  await page.reload()
  await expect(page.locator(canvas)).toHaveAttribute('data-example-stage', '4')
  await page.getByRole('button', { name: 'Data budgets', exact: true }).click()
  await expect(
    page.getByRole('combobox', { name: 'Image resolution', exact: true }),
  ).toHaveValue('1024')
  await expect(
    page.getByRole('slider', { name: 'Image inference steps', exact: true }),
  ).toHaveValue('20')
  await page
    .getByRole('button', {
      name: 'Return to infrastructure explorer',
      exact: true,
    })
    .click()
  await expect(page.locator(canvas)).toHaveAttribute('data-example-model', '')
  await expect(page.locator('.learn-metrics')).toContainText('640')
  await nav(page)
    .getByRole('button', { name: 'Trade-off lab', exact: true })
    .click()
  await expect(
    page.getByRole('slider', { name: 'Prompt length', exact: true }),
  ).toHaveValue('2048')
})

test('H3 and Music examples retain their local/hosted boundaries and exact media formats', async ({
  page,
}) => {
  test.setTimeout(70000)
  await open(page, 'minimax-h3', 0)
  await expect(page.locator('.model-stage-operations')).toContainText(
    'hosted Context-IR',
  )
  await page.getByRole('button', { name: 'Serving', exact: true }).click()
  await expect(page.locator('.model-recipe pre')).toContainText(
    '--num-gpus 4 --ulysses-degree 4',
  )
  await expect(page.locator('.model-study-content')).toContainText(
    'native sparse-attention implementation',
  )
  await choose(page, 'minimax-music-3')
  await page.getByRole('button', { name: 'Data budgets', exact: true }).click()
  await expect(page.locator('.model-budget-results')).toContainText('7.32')
  await page
    .getByRole('slider', { name: 'Song duration cap', exact: true })
    .fill('120')
  await expect(page.locator('.model-world-readouts')).toContainText('3,000')
  await expect(page.locator('.model-world-readouts')).toContainText('14.65')
  await page.getByRole('button', { name: 'Serving', exact: true }).click()
  await expect(page.locator('.model-study-content')).toContainText(
    'two CUDA GPUs',
  )
  await expect(page.locator('.model-study-content')).toContainText(
    '8GB example',
  )
  await expect(page.locator('.model-recipe pre')).toContainText(
    '"stream": false',
  )
  await page.getByRole('button', { name: 'Sources', exact: true }).click()
  await expect(
    page
      .locator('.model-source-list a')
      .filter({ hasText: 'availability notice' }),
  ).toHaveAttribute(
    'href',
    'https://platform.minimax.io/docs/api-reference/music-generation',
  )
})

test('duplex examples count sessions separately from GPUs and pause their teaching playback', async ({
  page,
}) => {
  test.setTimeout(70000)
  await open(page, 'personaplex', 3)
  await page.getByRole('button', { name: 'Data budgets', exact: true }).click()
  await page
    .getByRole('slider', { name: 'Concurrent voice sessions', exact: true })
    .fill('100')
  await expect(page.locator('.model-world-readouts')).toContainText('76.80')
  await expect(page.locator('.model-world-readouts')).toContainText('100slots')
  await expect(page.locator('.model-budget-results')).toContainText(
    'not GPU count',
  )
  await page
    .getByRole('button', { name: 'Play model walkthrough', exact: true })
    .click()
  await expect(page.locator(canvas)).not.toHaveAttribute(
    'data-example-stage',
    '3',
    { timeout: 20000 },
  )
  await page
    .getByRole('button', { name: 'Pause model walkthrough', exact: true })
    .click()
  const stage = await page.locator(canvas).getAttribute('data-example-stage')
  await page.waitForTimeout(400)
  await expect(page.locator(canvas)).toHaveAttribute(
    'data-example-stage',
    stage!,
  )
  await page.getByRole('button', { name: 'Serving', exact: true }).click()
  await expect(page.locator('.model-study-content')).toContainText(
    'single-session reference',
  )
})

test('world selection, focus, cinema and a return to the model preserve the same renderer and labels', async ({
  page,
}) => {
  test.setTimeout(80000)
  await open(page, 'kimi-k3', 3)
  const scene = await page.locator(canvas).elementHandle()
  await page
    .getByRole('button', { name: 'Hide model details', exact: true })
    .click()
  await expect(page.locator('.learn-panel')).toHaveCount(0)
  await page
    .getByRole('button', {
      name: 'Inspect model stage 2: Vision + tokens',
      exact: true,
    })
    .click()
  await expect(page.locator(canvas)).toHaveAttribute('data-example-stage', '1')
  await expect(page.locator('.model-study-content h2')).toHaveText(
    'Encode text and vision',
  )
  await page
    .getByRole('button', { name: 'Focus model stage', exact: true })
    .click()
  await expect(page.locator('.learn-panel')).toHaveCount(0)
  await expect(page.locator(canvas)).toHaveAttribute(
    'data-camera-view',
    'focus',
  )
  await page
    .getByRole('button', { name: 'Learning cinema mode', exact: true })
    .click()
  await expect(
    page.getByRole('button', { name: /Show learning controls/ }),
  ).toBeVisible()
  await page
    .getByRole('button', { name: 'Play model walkthrough', exact: true })
    .click()
  await page
    .getByRole('button', { name: 'Pause model walkthrough', exact: true })
    .click()
  await page.keyboard.press('h')
  await page
    .getByRole('button', {
      name: 'Return to infrastructure explorer',
      exact: true,
    })
    .click()
  await expect(page.locator(canvas)).toHaveAttribute(
    'data-motion-mode',
    'requests',
  )
  await nav(page)
    .getByRole('button', { name: 'Real models', exact: true })
    .click()
  await expect(page.locator(canvas)).toHaveAttribute(
    'data-example-model',
    'kimi-k3',
  )
  await expect(page.locator('.learning-world .scene-label')).toHaveCount(6)
  expect(
    await page.locator(canvas).evaluate((el, old) => el === old, scene),
  ).toBe(true)
})

test('mobile model controls, source scrolling and comparative readers fit narrow screens', async ({
  page,
}) => {
  test.setTimeout(70000)
  await page.setViewportSize({ width: 390, height: 844 })
  await open(page, 'cosyvoice-2', 3)
  await page.getByRole('button', { name: 'Data budgets', exact: true }).click()
  await page
    .getByRole('slider', { name: 'Speech chunk budget', exact: true })
    .fill('100')
  await expect(page.locator('.model-world-readouts')).toContainText('4.00')
  const panel = await page.locator('.learn-panel').boundingBox(),
    dock = await page.locator('.model-command-deck').boundingBox()
  expect(panel!.y + panel!.height).toBeLessThan(dock!.y)
  await page
    .getByRole('button', { name: 'Close learning panel', exact: true })
    .click()
  await page.setViewportSize({ width: 320, height: 700 })
  const brand = await page.locator('.learn-brand').boundingBox(),
    navigation = await nav(page).boundingBox(),
    tools = await page.locator('.learn-header-tools').boundingBox()
  expect(brand!.x + brand!.width).toBeLessThanOrEqual(navigation!.x)
  expect(navigation!.x + navigation!.width).toBeLessThanOrEqual(tools!.x)
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false)
  await page
    .getByRole('button', { name: 'Show model details', exact: true })
    .click()
  await page.getByRole('button', { name: 'Sources', exact: true }).click()
  await page.locator('.model-boundary').scrollIntoViewIfNeeded()
  const close = await page
      .getByRole('button', { name: 'Close learning panel', exact: true })
      .boundingBox(),
    surface = await page.locator('.learn-panel').boundingBox()
  expect(close!.y).toBeLessThan(surface!.y + 65)
  await page.getByRole('button', { name: 'Compare', exact: true }).click()
  const reader = page.getByRole('dialog', {
    name: 'Six real model workloads',
    exact: true,
  })
  await expect(reader).toBeVisible()
  await expect(reader.locator('tbody tr')).toHaveCount(6)
  await page.keyboard.press('Escape')
  await expect(reader).toHaveCount(0)
})

test('reduced motion and unavailable WebGL retain model stages, evidence and budgets', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (
      kind: string,
      ...args: unknown[]
    ) {
      if (kind.startsWith('webgl')) return null
      return Reflect.apply(original, this, [kind, ...args])
    } as typeof original
  })
  await page.goto('/?view=guide&example=cosyvoice-2&stage=2')
  await expect(page.getByText('MODEL PIPELINE · 2D FALLBACK')).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Play model walkthrough', exact: true }),
  ).toBeDisabled()
  await page.getByRole('button', { name: /Model stage 4:/ }).click()
  await expect(page.locator('.model-study-content h2')).toHaveText(
    'Convert tokens to mel frames',
  )
  await page.getByRole('button', { name: 'Data budgets', exact: true }).click()
  await page
    .getByRole('slider', { name: 'Speech chunk budget', exact: true })
    .fill('50')
  await expect(page.locator('.model-world-readouts')).toContainText('2.00')
  await page.getByRole('button', { name: 'Sources', exact: true }).click()
  await expect(
    page.locator('.model-source-list a').filter({ hasText: 'configuration' }),
  ).toHaveAttribute('href', /cosyvoice2.yaml$/)
  await page
    .getByRole('button', {
      name: 'Return to infrastructure explorer',
      exact: true,
    })
    .click()
  await expect(
    page.getByText('INTERACTIVE TOPOLOGY · 2D FALLBACK'),
  ).toBeVisible()
})
