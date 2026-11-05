import { test, expect } from '@playwright/test'
import { modelExamples } from '../src/examples/catalog'
import {
  browse,
  canvas,
  level,
  metrics,
  noWebGL,
  open,
  step,
} from './connected-helpers'

test('all six real models inhabit every physical scale on one canvas and do not add standalone navigation', async ({
  page,
}) => {
  test.setTimeout(220000)
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('/?view=explore')
  const original = await page.locator(canvas).elementHandle()
  const nav = page.getByRole('navigation', {
    name: 'Learning workspace navigation',
  })
  await expect(nav.getByRole('button')).toHaveCount(4)
  for (const title of ['Hot issues', 'AI lifecycle', 'Real models'])
    await expect(
      nav.getByRole('button', { name: title, exact: true }),
    ).toHaveCount(0)
  await browse(page)
  await expect(
    page.getByRole('button', { name: /^Explore model:/ }),
  ).toHaveCount(6)
  await page
    .getByRole('button', { name: 'Explore model: Kimi K3', exact: true })
    .click()
  const hardware: Record<string, string> = {}
  for (const model of modelExamples) {
    await page
      .getByRole('combobox', { name: 'Select real model', exact: true })
      .selectOption(model.id)
    await expect(page.locator(canvas)).toHaveAttribute(
      'data-context-id',
      model.id,
    )
    for (const id of ['fleet', 'pod', 'rack', 'gpu']) {
      await level(page, id)
      await expect(page.locator(canvas)).toHaveAttribute(
        'data-world-kind',
        'infrastructure',
      )
      const n = await page
        .locator(canvas)
        .getAttribute('data-hardware-instances')
      if (hardware[id]) expect(n).toBe(hardware[id])
      else hardware[id] = n!
      await expect(page.getByTestId('context-perspective')).toContainText(
        model.name,
      )
      await expect(page.locator('.learning-world')).not.toContainText(
        '0.0 MiB / rank',
      )
      await expect(page.locator('.learning-world')).not.toContainText(
        '17.5 GB of model weights / rank',
      )
    }
    expect(
      await page.locator(canvas).evaluate((el, old) => el === old, original),
    ).toBe(true)
  }
  expect(errors).toEqual([])
})

test('Qwen budgets and selected reader survive zooming and shared URLs without changing the reference workload', async ({
  page,
}) => {
  test.setTimeout(100000)
  await open(page, 'example=qwen-image-21&level=server')
  await page.getByRole('button', { name: 'Data budgets', exact: true }).click()
  await page
    .getByRole('combobox', { name: 'Image resolution', exact: true })
    .selectOption('1024')
  await page
    .getByRole('slider', { name: 'Image inference steps', exact: true })
    .fill('20')
  await expect(metrics(page)).toContainText('4.00 MiB')
  await level(page, 'gpu')
  await expect(
    page.getByRole('button', { name: 'Data budgets', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true')
  await expect(
    page.getByRole('combobox', { name: 'Image resolution', exact: true }),
  ).toHaveValue('1024')
  await page
    .getByRole('button', { name: 'Share model example', exact: true })
    .click()
  await expect(page).toHaveURL(/view=explore/)
  await expect(page).toHaveURL(/level=gpu/)
  await page.reload()
  await expect(page.locator(canvas)).toHaveAttribute(
    'data-context-id',
    'qwen-image-21',
  )
  await page.getByRole('button', { name: 'Data budgets', exact: true }).click()
  await expect(
    page.getByRole('slider', { name: 'Image inference steps', exact: true }),
  ).toHaveValue('20')
  await page
    .getByRole('button', { name: 'Clear connected story', exact: true })
    .click()
  await expect(page.locator(canvas)).toHaveAttribute('data-context-kind', '')
  await expect(page.locator(canvas)).toHaveAttribute('data-motion-layer', 'gpu')
  await expect(page.getByLabel('Learning model metrics')).toContainText('640')
})

test('H3 and Music retain documented local/hosted boundaries and media formats within the shared world', async ({
  page,
}) => {
  test.setTimeout(100000)
  await open(page, 'example=minimax-h3')
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
  await page
    .getByRole('combobox', { name: 'Select real model', exact: true })
    .selectOption('minimax-music-3')
  await page.getByRole('button', { name: 'Data budgets', exact: true }).click()
  await expect(page.locator('.model-budget-results')).toContainText('7.32')
  await page
    .getByRole('slider', { name: 'Song duration cap', exact: true })
    .fill('120')
  await expect(metrics(page)).toContainText('3,000')
  await expect(metrics(page)).toContainText('14.65')
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

test('PersonaPlex session budgets, camera focus, playback and cinema keep the same hardware and reference clock', async ({
  page,
}) => {
  test.setTimeout(150000)
  await open(page, 'example=personaplex&stage=3')
  const original = await page.locator(canvas).elementHandle(),
    time = await page
      .getByTestId('infrastructure-scene')
      .getAttribute('data-motion-time')
  await page.getByRole('button', { name: 'Data budgets', exact: true }).click()
  await page
    .getByRole('slider', { name: 'Concurrent voice sessions', exact: true })
    .fill('100')
  await expect(metrics(page)).toContainText('76.80')
  await expect(page.locator('.model-budget-results')).toContainText(
    'not GPU count',
  )
  await page
    .getByRole('button', { name: 'Focus connected hardware', exact: true })
    .click()
  await expect(page.locator(canvas)).toHaveAttribute(
    'data-camera-view',
    'focus',
  )
  await page
    .getByRole('button', { name: 'Learning cinema mode', exact: true })
    .click()
  await page
    .getByRole('button', { name: 'Play connected walkthrough', exact: true })
    .click()
  await expect(page.locator(canvas)).not.toHaveAttribute(
    'data-context-stage',
    '3',
    { timeout: 30000 },
  )
  await page
    .getByRole('button', { name: 'Pause connected walkthrough', exact: true })
    .click()
  await page.getByRole('button', { name: /Show learning controls/ }).click()
  await expect(page.getByTestId('infrastructure-scene')).toHaveAttribute(
    'data-motion-time',
    time!,
  )
  expect(
    await page.locator(canvas).evaluate((el, old) => el === old, original),
  ).toBe(true)
  await page
    .getByRole('button', { name: 'Show connected details', exact: true })
    .click()
  await page.getByRole('button', { name: 'Serving', exact: true }).click()
  await expect(page.locator('.model-study-content')).toContainText(
    'single-session reference',
  )
})

test('real model evidence and comparison stay accessible with reduced motion and physical-topology fallback', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await noWebGL(page)
  await page.goto('/?view=explore&learn=fusion&example=cosyvoice-2&level=gpu')
  await expect(page.locator('.fallback-topology')).toBeVisible()
  await expect(page.locator('.example-fallback')).toHaveCount(0)
  await expect(
    page.getByRole('button', {
      name: 'Play connected walkthrough',
      exact: true,
    }),
  ).toBeDisabled()
  await page.getByRole('button', { name: 'Sources', exact: true }).click()
  await expect(page.locator('.model-source-list a')).not.toHaveCount(0)
  await page.getByRole('button', { name: 'Compare', exact: true }).click()
  const dialog = page.getByRole('dialog', {
    name: 'Six real model workloads',
    exact: true,
  })
  await expect(dialog.locator('tbody tr')).toHaveCount(6)
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
})

test('expert and speech-token detail counts render on actual pod workers rather than extra stage platforms', async ({
  page,
}) => {
  await open(page, 'example=kimi-k3&stage=3')
  await expect(page.locator(canvas)).toHaveAttribute(
    'data-context-glyphs',
    '896',
  )
  await expect(page.locator(canvas)).toHaveAttribute('data-motion-layer', 'pod')
  const count = await page
    .locator(canvas)
    .getAttribute('data-hardware-instances')
  await page
    .getByRole('combobox', { name: 'Select real model', exact: true })
    .selectOption('cosyvoice-2')
  await page.getByRole('button', { name: 'Data budgets', exact: true }).click()
  await page
    .getByRole('slider', { name: 'Speech chunk budget', exact: true })
    .fill('100')
  await expect(page.locator(canvas)).toHaveAttribute(
    'data-context-glyphs',
    '100',
  )
  await expect(page.locator(canvas)).toHaveAttribute(
    'data-hardware-instances',
    count!,
  )
})

test('a paused connected scene rests the GPU and redraws when its camera or experiment changes', async ({
  page,
}) => {
  await open(page, 'example=qwen-image-21&level=gpu')
  const world = page.locator(canvas)
  await expect(world).toHaveAttribute('data-world-settled', 'true')
  await expect
    .poll(async () => {
      const before = Number(await world.getAttribute('data-context-paints'))
      await page.waitForTimeout(650)
      return Number(await world.getAttribute('data-context-paints')) - before
    })
    .toBe(0)
  const before = Number(await world.getAttribute('data-context-paints'))
  await page.getByRole('button', { name: 'Top down', exact: true }).click()
  await expect
    .poll(async () => Number(await world.getAttribute('data-context-paints')))
    .toBeGreaterThan(before)
  await expect(world).toHaveAttribute('data-world-settled', 'true')
  const afterCamera = Number(await world.getAttribute('data-context-paints'))
  await page.getByRole('button', { name: 'Data budgets', exact: true }).click()
  await page
    .getByRole('combobox', { name: 'Image resolution', exact: true })
    .selectOption('1024')
  await expect
    .poll(async () => Number(await world.getAttribute('data-context-paints')))
    .toBeGreaterThan(afterCamera)
  await expect(metrics(page)).toContainText('4.00 MiB')
})
