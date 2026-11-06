import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

const world = '.learning-world canvas'
async function learning(page: Page, view = 'explore') {
  await page.goto(`/?view=${view}`)
  await expect(
    page.getByRole('region', { name: 'Immersive Learning workspace' }),
  ).toBeVisible()
  await expect(page.locator(world)).toHaveCount(1)
}
async function settled(page: Page) {
  await expect(page.locator(world)).toHaveAttribute(
    'data-camera-moving',
    'false',
    { timeout: 15000 },
  )
}

test('Learning defaults to a spatial inspector and preserves its world across all four workspaces', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await learning(page)
  await page
    .getByRole('button', { name: 'Pause timeline', exact: true })
    .click()
  const scene = await page.locator(world).elementHandle()
  await expect(
    page.getByRole('heading', { name: 'The fleet scheduler', exact: true }),
  ).toBeVisible()
  await settled(page)
  const card = await page.locator('.learn-object-card').boundingBox()
  expect(card!.x).toBeGreaterThan(900)
  await page.getByRole('button', { name: 'Trade-offs', exact: true }).click()
  await expect(page.locator('.learn-object-card')).toContainText(
    'WHAT IT COSTS',
  )
  await page
    .getByRole('button', { name: 'Focus in the world', exact: true })
    .click()
  await expect(page.locator('.learn-object-card')).toHaveCount(0)
  await expect(page.locator(world)).toHaveAttribute('data-camera-view', 'focus')
  for (const [name, heading] of [
    ['Request journey', 'Follow the state.'],
    ['Trade-off lab', 'Make the trade-offs visible.'],
    ['Field guide', 'Build your mental model.'],
    ['Explore', 'A fleet is a system of systems.'],
  ]) {
    await page.getByRole('button', { name, exact: true }).click()
    await expect(page.locator('.learn-scope h1')).toHaveText(heading)
    expect(
      await page.locator(world).evaluate((el, old) => el === old, scene),
    ).toBe(true)
  }
  expect(errors).toEqual([])
})

test('lab strategy, payload dimensions, overload and shared links use one parameter state', async ({
  page,
}) => {
  await learning(page, 'lab')
  await page.getByRole('button', { name: /Split prefill & decode/ }).click()
  await expect(page.locator(world)).toHaveAttribute(
    'data-strategy',
    'disaggregated',
  )
  await page
    .getByRole('slider', { name: 'Prompt length', exact: true })
    .fill('4096')
  await page
    .getByRole('slider', { name: 'Fabric endpoint', exact: true })
    .fill('25')
  await expect(page.locator('.learn-metrics')).toContainText('1280')
  await expect(page.locator('.learn-outcome-grid')).toContainText('614 ms')
  await page
    .getByRole('button', { name: 'Copy learning scenario', exact: true })
    .click()
  await expect(page).toHaveURL(/learn=fusion/)
  await expect(page).toHaveURL(/inputTokens=4096/)
  await expect(page).toHaveURL(/networkGbps=25/)
  await page.reload()
  await expect(
    page.getByRole('slider', { name: 'Prompt length', exact: true }),
  ).toHaveValue('4096')
  await expect(
    page.getByRole('button', { name: /Split prefill & decode/ }),
  ).toHaveAttribute('aria-pressed', 'true')
  await page
    .getByRole('button', { name: 'Close learning panel', exact: true })
    .click()
  await page.getByRole('button', { name: 'KV cache', exact: true }).click()
  await page.getByRole('button', { name: 'Inspect data', exact: true }).click()
  await expect(
    page.getByRole('region', { name: 'Learning payload inspection' }),
  ).toContainText('1280 MiB total · 160.0 MiB / rank')
  await page
    .getByRole('button', { name: 'Close learning inspection', exact: true })
    .click()
  await page.getByRole('button', { name: 'Trade-off lab', exact: true }).click()
  await page.getByRole('button', { name: 'Traffic spike', exact: true }).click()
  await page.getByRole('button', { name: /Continuous batching/ }).click()
  await expect(page.locator('.learn-model-status')).toContainText(
    'queue grows without bound',
  )
  await expect(page.locator('.learn-outcome-grid')).toContainText(
    'Over capacity',
  )
})

test('request journey skips optional retrieval and places prefill and KV handoff in their real teaching worlds', async ({
  page,
}) => {
  await learning(page, 'journey')
  const prompt = 'How do GPUs cooperate? <local example>'
  await page
    .getByRole('textbox', { name: 'Example prompt', exact: true })
    .fill(prompt)
  await page
    .getByRole('checkbox', { name: 'Include retrieval (RAG)', exact: true })
    .uncheck()
  await page
    .getByRole('button', { name: 'Inspect example payload', exact: true })
    .click()
  await expect(page.locator('.learn-journey-payload')).toContainText(prompt)
  await page.getByRole('button', { name: 'Next stage', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'Tokenize & route', exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Stage 2: Retrieval', exact: true }),
  ).toBeDisabled()
  await page
    .getByRole('button', { name: 'Stage 4: Prefill', exact: true })
    .click()
  await expect(page.locator(world)).toHaveAttribute(
    'data-motion-mode',
    'tensors',
  )
  await expect(page.locator(world)).toHaveAttribute('data-motion-layer', 'gpu')
  await expect(page.locator('.experience-request-lenses')).toBeHidden()
  await expect(
    page.getByRole('group', {
      name: 'Request walkthrough playback',
      exact: true,
    }),
  ).toBeVisible()
  await page
    .getByRole('button', { name: 'Stage 5: KV handoff', exact: true })
    .click()
  await expect(page.locator(world)).toHaveAttribute('data-motion-mode', 'kv')
  await expect(page.locator(world)).toHaveAttribute('data-motion-layer', 'pod')
  await expect(page.locator('.learn-representation')).toContainText('640 MiB')
  await expect(page.locator('.learn-journey-payload')).toContainText(
    '671088640',
  )
  await page
    .getByRole('button', { name: 'Stage 7: Response', exact: true })
    .click()
  await expect(
    page.getByRole('heading', { name: 'Stream & release', exact: true }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Start again', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'A request arrives', exact: true }),
  ).toBeVisible()
})

test('the ring playground and transformer chapters stay synchronized with the animated data', async ({
  page,
}) => {
  await learning(page)
  await page.getByRole('button', { name: 'Collectives', exact: true }).click()
  await page
    .getByRole('button', {
      name: 'Open synchronized ring playground',
      exact: true,
    })
    .click()
  await page
    .getByRole('slider', { name: 'Completed ring exchanges', exact: true })
    .fill('7')
  await expect(page.locator('.learn-rank-chunks .complete')).toHaveCount(1)
  await page
    .getByRole('slider', { name: 'Completed ring exchanges', exact: true })
    .fill('14')
  await expect(page.locator('.learn-rank-chunks strong')).toHaveText(
    Array(8).fill('36'),
  )
  await expect(
    page
      .locator('.learning-world .scene-label')
      .filter({ hasText: '8/8 chunks complete' }),
  ).toHaveCount(8)
  await page.getByRole('button', { name: 'GPU 4', exact: true }).click()
  await expect(page.locator('.learn-rank-chunks')).toHaveAttribute(
    'aria-label',
    'GPU 4 chunk values',
  )
  await page
    .getByRole('button', { name: 'Previous exchange', exact: true })
    .click()
  await expect(
    page.getByRole('slider', { name: 'Completed ring exchanges' }),
  ).toHaveValue('13')
  await page.getByRole('button', { name: 'Tensor flow', exact: true }).click()
  await page
    .getByRole('button', { name: 'Open animation chapters', exact: true })
    .click()
  await page
    .getByRole('button', { name: /Animation chapter 4: Attend/ })
    .click()
  await expect(
    page.getByRole('slider', { name: 'Animation timeline', exact: true }),
  ).toHaveValue('18')
  await expect(page.locator('.learn-narration')).toContainText(
    'upper triangle stays dark',
  )
  await expect(page.locator(world)).toHaveAttribute('data-motion-layer', 'gpu')
})

test('library concepts locate the hardware and retain complete research and model readers', async ({
  page,
}) => {
  await learning(page, 'guide')
  await page.getByRole('button', { name: 'Glossary', exact: true }).click()
  await page
    .getByRole('searchbox', { name: 'Search learning library' })
    .fill('PagedAttention')
  await expect(page.locator('.learn-glossary article')).toHaveCount(1)
  await page
    .getByRole('button', { name: 'See this in the world', exact: true })
    .click()
  await expect(
    page.getByRole('heading', { name: 'High-bandwidth memory', exact: true }),
  ).toBeVisible()
  await expect(page.locator(world)).toHaveAttribute('data-motion-layer', 'gpu')
  await expect(page.locator(world)).toHaveAttribute('data-motion-mode', 'kv')
  await page.getByRole('button', { name: 'Field guide', exact: true }).click()
  await page
    .getByRole('searchbox', { name: 'Search learning library' })
    .fill('')
  await page
    .getByRole('button', { name: 'Primary sources', exact: true })
    .click()
  await expect(page.locator('.learn-source-list a')).toHaveCount(6)
  await expect(page.locator('.learn-source-list a').first()).toHaveAttribute(
    'href',
    /^https:\/\//,
  )
  await page
    .getByRole('button', { name: 'Open the complete field guide', exact: true })
    .click()
  const reader = page.getByRole('dialog', {
    name: 'Complete field guide',
    exact: true,
  })
  await expect(reader).toBeVisible()
  await expect(
    reader.getByRole('heading', {
      name: 'Parallelism solves different problems.',
      exact: true,
    }),
  ).toBeAttached()
  await expect(reader.locator('.network-guide-grid article')).toHaveCount(3)
  await page.keyboard.press('Escape')
  await expect(reader).toHaveCount(0)
  await page.getByRole('button', { name: 'Trade-off lab', exact: true }).click()
  await page
    .getByRole('button', { name: 'Full workbench', exact: true })
    .click()
  await page.getByText('Open the model. Inspect every assumption.').click()
  await expect(
    page.getByRole('heading', { name: 'Serving coefficients', exact: true }),
  ).toBeVisible()
  await page
    .getByRole('button', { name: 'Close learning dialog', exact: true })
    .click()
  await expect(page.locator('.learn-lab-content')).toBeVisible()
})

test('camera rides, labels, cinema and the classic layout retain the learning clock and canvas', async ({
  page,
}) => {
  await learning(page)
  await page
    .getByRole('button', { name: 'Pause timeline', exact: true })
    .click()
  const scene = await page.locator(world).elementHandle()
  await page
    .getByRole('button', { name: 'Close learning inspection', exact: true })
    .click()
  await page.getByRole('button', { name: 'Top down', exact: true }).click()
  await settled(page)
  await expect(page.locator(world)).toHaveAttribute('data-camera-view', 'top')
  await page
    .getByRole('button', { name: 'Hide learning labels', exact: true })
    .click()
  await expect(
    page.locator('.learning-world .scene-label[aria-hidden="false"]'),
  ).toHaveCount(0)
  await page
    .getByRole('button', { name: 'Show learning labels', exact: true })
    .click()
  await page
    .getByRole('button', { name: 'Ride with learning payload', exact: true })
    .click()
  await expect(page.locator(world)).toHaveAttribute(
    'data-camera-view',
    'follow',
  )
  const before = await page.locator(world).getAttribute('data-camera-pose')
  await expect
    .poll(() => page.locator(world).getAttribute('data-camera-pose'))
    .not.toBe(before)
  await page
    .getByRole('button', { name: 'Learning cinema mode', exact: true })
    .click()
  await expect(
    page.getByRole('button', { name: /Show learning controls/ }),
  ).toBeVisible()
  await expect(page.locator('.learn-header')).toHaveCount(0)
  await page.keyboard.press('h')
  await page
    .getByRole('button', { name: 'Isometric view', exact: true })
    .click()
  await page
    .getByRole('slider', { name: 'Animation timeline', exact: true })
    .fill('29')
  await page
    .getByRole('button', {
      name: 'Switch to classic learning layout',
      exact: true,
    })
    .click()
  await expect(
    page.getByRole('slider', { name: 'Animation timeline', exact: true }),
  ).toHaveValue('29')
  await page
    .getByRole('button', {
      name: 'Switch to immersive learning layout',
      exact: true,
    })
    .click()
  await expect(
    page.getByRole('slider', { name: 'Animation timeline', exact: true }),
  ).toHaveValue('29')
  expect(
    await page.locator(world).evaluate((el, old) => el === old, scene),
  ).toBe(true)
})

test('tablet and mobile learning keep panels clear of headings and the dock, with close controls while scrolling', async ({
  page,
}) => {
  await page.setViewportSize({ width: 800, height: 1000 })
  await learning(page, 'guide')
  const tabletPanel = await page.locator('.learn-panel').boundingBox(),
    metrics = await page.locator('.learn-metrics').boundingBox(),
    scope = await page.locator('.learn-scope').boundingBox()
  expect(tabletPanel!.y).toBeGreaterThanOrEqual(metrics!.y + metrics!.height)
  expect(tabletPanel!.y).toBeGreaterThanOrEqual(scope!.y + scope!.height)
  await page.setViewportSize({ width: 390, height: 844 })
  await learning(page, 'lab')
  await page
    .getByRole('button', { name: 'Full workbench', exact: true })
    .scrollIntoViewIfNeeded()
  const panel = await page.locator('.learn-panel').boundingBox(),
    dock = await page.locator('.learn-command-deck').boundingBox()
  expect(panel!.x).toBeGreaterThanOrEqual(13)
  expect(panel!.x + panel!.width).toBeLessThanOrEqual(377)
  expect(panel!.y + panel!.height).toBeLessThan(dock!.y)
  const close = await page
    .getByRole('button', { name: 'Close learning panel', exact: true })
    .boundingBox()
  expect(close!.y).toBeGreaterThanOrEqual(panel!.y)
  expect(close!.y).toBeLessThan(panel!.y + 70)
  await page
    .getByRole('button', { name: 'Close learning panel', exact: true })
    .click()
  await page
    .getByRole('button', { name: 'Learning component picker', exact: true })
    .click()
  await page.getByRole('button', { name: /The fleet scheduler/ }).click()
  await expect(
    page.getByRole('region', {
      name: 'Learning object inspector',
      exact: true,
    }),
  ).toBeVisible()
  await page.setViewportSize({ width: 320, height: 700 })
  await expect
    .poll(async () => {
      const box = await page.locator('.learn-object-card').boundingBox()
      return box!.x >= 13 && box!.x + box!.width <= 307
    })
    .toBe(true)
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false)
  const smallCard = await page.locator('.learn-object-card').boundingBox(),
    smallDock = await page.locator('.learn-command-deck').boundingBox()
  expect(smallCard!.y + smallCard!.height).toBeLessThan(smallDock!.y)
})

test('reduced motion and unavailable WebGL keep the entire learning workspace usable', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await learning(page)
  await expect(
    page.getByRole('slider', { name: 'Animation timeline', exact: true }),
  ).toHaveValue('0')
  await page.getByRole('button', { name: 'Top down', exact: true }).click()
  await expect(page.locator(world)).toHaveAttribute(
    'data-camera-moving',
    'false',
  )
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
  await page.reload()
  await expect(
    page.getByText('INTERACTIVE TOPOLOGY · 2D FALLBACK'),
  ).toBeVisible()
  await page.getByRole('button', { name: 'KV cache', exact: true }).click()
  await expect(page.locator('.learn-narration h2')).toHaveText(
    'Move eight shards to the decode worker',
  )
  await page.getByRole('button', { name: 'Inspect data', exact: true }).click()
  await expect(
    page.getByRole('region', {
      name: 'Learning payload inspection',
      exact: true,
    }),
  ).toContainText('640 MiB total')
  await page
    .getByRole('button', { name: 'Close learning inspection', exact: true })
    .click()
  await page.getByRole('button', { name: 'Collectives', exact: true }).click()
  await page
    .getByRole('button', {
      name: 'Open synchronized ring playground',
      exact: true,
    })
    .click()
  await page
    .getByRole('slider', { name: 'Completed ring exchanges', exact: true })
    .fill('14')
  await expect(page.locator('.learn-rank-chunks strong')).toHaveText(
    Array(8).fill('36'),
  )
  await page
    .getByRole('button', { name: 'Request journey', exact: true })
    .click()
  await page
    .getByRole('button', { name: 'Stage 4: Prefill', exact: true })
    .click()
  await expect(page.locator('.fallback-motion-phase')).toContainText(
    'Token IDs index embedding rows',
  )
  await expect(page.locator('.experience-flow-coach')).toContainText(
    'Prefill builds attention state',
  )
  await expect(page.locator('.learn-narration')).toHaveCount(0)
  await page.getByRole('button', { name: 'Trade-off lab', exact: true }).click()
  await page
    .getByRole('slider', { name: 'Prompt length', exact: true })
    .fill('4096')
  await expect(page.locator('.learn-metrics')).toContainText('1280')
})
