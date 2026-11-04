import { test, expect } from '@playwright/test'

test('3D explorer renders, layers and traffic modes expose different explanations', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('/')
  await expect(page.locator('canvas')).toHaveCount(1)
  await expect(
    page.getByRole('heading', { name: 'The fleet scheduler' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'KV cache', exact: true }).click()
  await expect(page.getByText('State moves, too.')).toBeVisible()
  await page.getByRole('button', { name: /02 Pod 5,000 GPUs/ }).click()
  await expect(
    page.getByRole('heading', { name: 'Prefill workers', exact: true }),
  ).toBeVisible()
  await page.getByRole('button', { name: /03 Server 8 GPUs/ }).click()
  await expect(
    page.getByRole('heading', { name: 'NVLink & NVSwitch' }),
  ).toBeVisible()
  await page.getByRole('button', { name: /04 GPU 1 GPU/ }).click()
  await expect(
    page.getByRole('heading', { name: 'High-bandwidth memory' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Compute', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'Tensor cores & attention' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click()
  await page.getByRole('button', { name: 'Reset camera' }).click()
  await page.getByRole('button', { name: 'Pause animation' }).click()
  await expect(
    page.getByRole('button', { name: 'Resume animation' }),
  ).toBeVisible()
  expect(errors).toEqual([])
})

test('request walkthrough accepts a prompt, skips optional retrieval and reaches streaming', async ({
  page,
}) => {
  await page.goto('/')
  await page
    .getByRole('button', { name: 'Follow a request', exact: true })
    .click()
  await page.getByLabel('Example prompt').fill('How do GPUs cooperate?')
  await page.getByRole('checkbox', { name: /Include retrieval/ }).uncheck()
  await page.getByRole('button', { name: 'Trace request' }).click()
  await expect(page.getByText('“How do GPUs cooperate?”')).toBeVisible()
  await page.getByRole('button', { name: 'Next stage' }).click()
  await expect(
    page.getByRole('heading', { name: 'Tokenize & route' }),
  ).toBeVisible()
  await page.getByRole('button', { name: /07 Response/ }).click()
  await expect(
    page.getByRole('heading', { name: 'Stream & release' }),
  ).toBeVisible()
  await page.getByRole('button', { name: /Inspect example payload/ }).click()
  await expect(page.locator('.payload-code')).toContainText('req_strata_001')
  await page.getByRole('button', { name: 'Start again' }).click()
  await expect(
    page.getByRole('heading', { name: 'A request arrives' }),
  ).toBeVisible()
})

test('lab recomputes demand, topology and handoff without reporting finite overloaded latency', async ({
  page,
}) => {
  await page.goto('/?gpus=100000&arrivalRate=18000')
  await expect(page.getByRole('heading', { name: 'Your system' })).toBeVisible()
  await page.getByRole('button', { name: 'Traffic spike' }).click()
  await expect(
    page.getByText('Overloaded: the queue grows without bound.'),
  ).toBeVisible()
  await expect(page.locator('.lab-metrics')).toContainText('Over capacity')
  await page.getByRole('button', { name: /Reset/ }).click()
  await page.getByRole('button', { name: /03 \/ STRATEGY/ }).click()
  await expect(
    page.getByRole('heading', { name: /19 ms per handoff/ }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Constrained network' }).click()
  await expect(
    page.getByRole('heading', { name: /307 ms per handoff/ }),
  ).toBeVisible()
  await page.getByText('Open the model. Inspect every assumption.').click()
  await expect(
    page.getByRole('heading', { name: 'Serving coefficients' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Share scenario' }).click()
  await expect(page).toHaveURL(/networkGbps=25/)
  await page.reload()
  await expect(
    page.getByRole('slider', { name: 'Endpoint network' }),
  ).toHaveValue('25')
  await expect(
    page.getByRole('button', { name: /03 \/ STRATEGY/ }),
  ).toHaveAttribute('aria-pressed', 'true')
})

test('guide is searchable and modal supports keyboard dismissal', async ({
  page,
}) => {
  await page.goto('/')
  await page
    .getByRole('button', { name: /Field guide Go a little deeper/ })
    .click()
  await page.getByRole('textbox', { name: 'Search glossary' }).fill('paged')
  await expect(page.locator('.glossary-grid article')).toHaveCount(1)
  await expect(
    page.getByRole('heading', { name: 'PagedAttention', exact: true }),
  ).toBeVisible()
  await page
    .getByRole('textbox', { name: 'Search glossary' })
    .fill('no-matching-concept')
  await expect(
    page.getByText('No matching concepts.', { exact: false }),
  ).toBeVisible()
  await page.getByRole('button', { name: /How to explore/ }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('mobile navigation and all pages fit a narrow viewport', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await expect(page.locator('canvas')).toHaveCount(1)
  for (const name of [
    'Follow a request',
    'Trade-off lab',
    'Field guide',
    'Infrastructure explorer',
  ]) {
    await page.getByRole('button', { name: 'Open navigation' }).click()
    await page
      .getByRole('navigation', { name: 'Main navigation' })
      .getByRole('button', { name: new RegExp(name) })
      .click()
    await expect(page.locator('h1')).toBeVisible()
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true)
  }
})

test('non-WebGL devices retain an interactive accessible topology', async ({
  page,
}) => {
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
  await page.goto('/')
  await expect(
    page.getByText('INTERACTIVE TOPOLOGY · 2D FALLBACK'),
  ).toBeVisible()
  await page
    .locator('.fallback-topology')
    .getByRole('button', { name: 'Decode workers' })
    .click()
  await expect(
    page.getByRole('heading', { name: 'Decode workers', exact: true }),
  ).toBeVisible()
})

test('collective playground executes the complete ring all-reduce', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Collectives', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'Eight GPUs. One shared answer.' }),
  ).toBeVisible()
  for (let step = 0; step < 7; step++)
    await page.getByRole('button', { name: 'Next exchange' }).click()
  await expect(page.locator('.ring-phase')).toHaveText('Reduce-scatter')
  await expect(
    page.locator('.chunk-values strong').filter({ hasText: '36' }),
  ).toHaveCount(1)
  for (let step = 0; step < 7; step++)
    await page.getByRole('button', { name: 'Next exchange' }).click()
  await expect(page.locator('.ring-phase')).toHaveText('All-reduce complete')
  await expect(
    page.locator('.chunk-values strong').filter({ hasText: '36' }),
  ).toHaveCount(8)
  await page
    .getByRole('button', { name: 'Inspect rank 4', exact: true })
    .click()
  await expect(
    page.locator('.chunk-values strong').filter({ hasText: '36' }),
  ).toHaveCount(8)
  await page.getByRole('button', { name: 'Reset collective' }).click()
  await expect(
    page.locator('.chunk-values strong').filter({ hasText: /^5$/ }),
  ).toHaveCount(8)
})
