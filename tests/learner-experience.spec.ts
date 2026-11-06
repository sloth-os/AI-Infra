import { test, expect } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'
import { mkdir } from 'node:fs/promises'

const world = '.learning-world canvas'
async function reachable(control: Locator) {
  await expect(control).toBeVisible()
  await expect(control).toBeInViewport({ ratio: 1 })
  expect(
    await control.evaluate((el) => {
      const r = el.getBoundingClientRect()
      const hit = document.elementFromPoint(
        r.x + r.width / 2,
        r.y + r.height / 2,
      )
      return !!hit && (el.contains(hit) || hit.contains(el))
    }),
  ).toBe(true)
}
async function shot(page: Page, name: string) {
  await mkdir('/tmp/aiinfra-improvements-review', { recursive: true })
  await page.screenshot({
    path: `/tmp/aiinfra-improvements-review/${name}.png`,
  })
}
async function start(page: Page, title: string) {
  await page.goto('./')
  await page
    .getByRole('button', { name: `Start lesson: ${title}`, exact: true })
    .click()
  await expect(page.locator(world)).toHaveAttribute(
    'data-world-kind',
    'infrastructure',
  )
  await expect(
    page.getByRole('region', { name: 'Current learning goal' }),
  ).toBeVisible()
}

test('fresh visitors choose a goal, can explore freely, and explicit routes remain direct', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('./')
  const welcome = page.getByRole('dialog', {
    name: 'Understand the infrastructure behind an answer.',
  })
  await expect(welcome).toBeVisible()
  await expect(
    welcome.getByRole('button', { name: /^Start lesson:/ }),
  ).toHaveCount(3)
  await shot(page, '01-welcome-desktop')
  await page
    .getByRole('button', { name: 'Explore freely', exact: true })
    .click()
  await expect(welcome).toHaveCount(0)
  await expect(page.locator('.experience-learn')).toHaveText('Learn')
  await expect(page.locator('.experience-role-long').first()).toHaveText(
    'Model operator',
  )
  await page.reload()
  await expect(welcome).toHaveCount(0)
  await page.evaluate(() => localStorage.clear())
  await page.goto('./?operation=inference')
  await expect(welcome).toHaveCount(0)
  await expect(page.locator('.campaign-game')).toHaveAttribute(
    'data-phase',
    'inference',
  )
  expect(errors).toEqual([])
})

test('request lesson has one persistent player, meaningful flows and a reflection', async ({
  page,
}) => {
  test.setTimeout(120000)
  const errors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  await page.setViewportSize({ width: 1366, height: 768 })
  await start(page, 'Follow one API request')
  const canvas = await page.locator(world).elementHandle()
  const player = page.getByRole('group', {
    name: 'Request walkthrough playback',
    exact: true,
  })
  await reachable(
    player.getByRole('button', { name: 'Next stage', exact: true }),
  )
  await expect(
    page.getByRole('button', { name: 'Play timeline', exact: true }),
  ).toHaveCount(0)
  await expect(
    page.getByRole('button', { name: 'Resume explanation', exact: true }),
  ).toHaveCount(0)
  await expect(page.getByLabel('Current infrastructure scope')).toContainText(
    '100,000 modeled GPUs',
  )
  await shot(page, '02-request-desktop')
  await player
    .getByRole('button', { name: 'Play walkthrough', exact: true })
    .click()
  await expect(
    page.getByRole('button', { name: 'Stage 2: Retrieval', exact: true }),
  ).toHaveAttribute('aria-current', 'step', { timeout: 15000 })
  await page
    .getByRole('button', { name: 'Explain the current 3D flow', exact: true })
    .click()
  await expect(
    player.getByRole('button', { name: 'Play walkthrough', exact: true }),
  ).toBeVisible()
  await page.keyboard.press('Escape')
  await player.getByRole('button', { name: 'Previous', exact: true }).click()
  for (let i = 0; i < 3; i++)
    await player
      .getByRole('button', { name: 'Next stage', exact: true })
      .click()
  await page
    .getByRole('button', { name: 'Explain the current 3D flow', exact: true })
    .click()
  const flow = page.locator('.experience-flow-popover:popover-open')
  await expect(flow).toContainText('Prefill builds attention state')
  await expect(flow).toContainText('Token embeddings + weights')
  await page.keyboard.press('Escape')
  await expect(flow).toHaveCount(0)
  await expect(page.locator('.learn-panel')).toBeVisible()
  await page
    .getByRole('button', { name: 'Explain the current 3D flow', exact: true })
    .click()
  await flow.getByRole('button', { name: 'Explain HBM', exact: true }).click()
  await expect(
    page.locator('.experience-term-popover:popover-open'),
  ).toContainText('High-bandwidth memory')
  await shot(page, '03-glossary')
  await page.keyboard.press('Escape')
  await expect(flow).toBeVisible()
  await flow
    .getByRole('button', {
      name: 'Locate this subject in the world',
      exact: false,
    })
    .click()
  await expect(flow).toHaveCount(0)
  for (let i = 0; i < 3; i++)
    await player
      .getByRole('button', { name: 'Next stage', exact: true })
      .click()
  await player
    .getByRole('button', { name: 'What you learned', exact: true })
    .click()
  const recap = page.getByRole('region', {
    name: 'Learning recap',
    exact: true,
  })
  await expect(recap).toContainText('7 of 7 request stages visited')
  await recap
    .getByRole('button', {
      name: 'No; colocated serving can reuse local state.',
      exact: true,
    })
    .click()
  await expect(recap.getByRole('status')).toContainText('That is the key idea.')
  await expect(recap.getByRole('status')).toBeInViewport({ ratio: 1 })
  await shot(page, '04-request-recap')
  expect(
    await page.locator(world).evaluate((el, old) => el === old, canvas),
  ).toBe(true)
  expect(errors).toEqual([])
})

test('request controls remain visible with text labels on phones and landscape', async ({
  page,
}) => {
  test.setTimeout(150000)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('./')
  await shot(page, '05-welcome-phone')
  await page
    .getByRole('button', {
      name: 'Start lesson: Follow one API request',
      exact: true,
    })
    .click()
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 320, height: 568 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(viewport)
    const next = page.getByRole('button', { name: 'Next stage', exact: true })
    await reachable(next)
    const nav = page.getByRole('navigation', {
      name: 'Learning workspace navigation',
    })
    await reachable(
      nav.getByRole('button', { name: 'Request journey', exact: true }),
    )
    await expect(nav).toContainText('Request')
    await expect(nav.locator('.experience-nav-short').nth(1)).toBeVisible()
    await shot(page, `06-request-${viewport.width}`)
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true)
    const panel = await page.locator('.learn-panel').boundingBox(),
      dock = await page.locator('.learn-command-deck').boundingBox()
    expect(panel!.height).toBeGreaterThan(50)
    expect(panel!.y + panel!.height).toBeLessThanOrEqual(dock!.y)
  }
})

for (const title of [
  'Fix a training memory problem',
  'Run a cloud for model providers',
]) {
  test(`${title} keeps goals, readers and scale controls usable on small screens`, async ({
    page,
  }) => {
    test.setTimeout(150000)
    await page.setViewportSize({ width: 390, height: 844 })
    await start(page, title)
    for (const viewport of [
      { width: 390, height: 844 },
      { width: 320, height: 568 },
      { width: 844, height: 390 },
    ]) {
      await page.setViewportSize(viewport)
      const goal = page.getByRole('region', { name: 'Current learning goal' })
      await reachable(goal.getByRole('button').first())
      await reachable(
        page
          .getByRole('navigation', { name: 'Infrastructure scale' })
          .getByRole('button')
          .first(),
      )
      await reachable(
        page.getByRole('button', {
          name: 'Explain the current 3D flow',
          exact: true,
        }),
      )
      const panel = await page.locator('.learn-panel').boundingBox(),
        dock = await page.locator('.learn-command-deck').boundingBox()
      expect(panel!.height).toBeGreaterThan(50)
      expect(panel!.y + panel!.height).toBeLessThanOrEqual(dock!.y)
      await shot(
        page,
        `${title.startsWith('Fix') ? '12-training' : '13-cloud'}-${viewport.width}`,
      )
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true)
    }
  })
}

test('training goal compares state ownership without claiming an executed update', async ({
  page,
}) => {
  await start(page, 'Fix a training memory problem')
  await expect(page.getByLabel('Current infrastructure scope')).toContainText(
    '64-GPU sized job',
  )
  await expect(page.getByTestId('context-perspective')).toContainText('Server')
  await page
    .getByRole('button', { name: 'Compare ZeRO-3', exact: true })
    .click()
  await expect(
    page.getByRole('button', { name: 'Review lesson', exact: true }),
  ).toBeVisible()
  await shot(page, '07-training-sizing')
  await page.getByRole('button', { name: 'Review lesson', exact: true }).click()
  const recap = page.getByRole('region', {
    name: 'Learning recap',
    exact: true,
  })
  await expect(recap).toContainText('No training update was executed')
  await expect(recap).toContainText('model state only')
  await recap
    .getByRole('button', {
      name: 'No; activations, workspace and communication also matter.',
      exact: true,
    })
    .click()
  await expect(recap.getByRole('status')).toContainText('That is the key idea.')
  await shot(page, '08-training-recap')
})

test('Cloud goal keeps the comparison moment, explains multiple objectives and observes completions', async ({
  page,
}) => {
  test.setTimeout(120000)
  await start(page, 'Run a cloud for model providers')
  const clock = page.getByRole('slider', {
    name: 'Cloud replay time',
    exact: true,
  })
  await expect(clock).toHaveValue('12')
  await expect(page.getByLabel('Current infrastructure scope')).toContainText(
    '64 physical GPU slots',
  )
  await page.getByRole('button', { name: 'Try placement', exact: true }).click()
  await expect(clock).toHaveValue('12')
  await expect(page.getByTestId('cloud-provider-study')).toHaveAttribute(
    'data-side',
    'plan',
  )
  await page
    .getByRole('button', { name: 'Compare full plan', exact: true })
    .click()
  await expect(clock).toHaveValue('12')
  await expect(page.locator('.provider-plan-state')).toContainText(
    '8/8 policies active',
  )
  await expect(page.locator('.provider-comparison-goal')).toContainText(
    'One throughput counter alone',
  )
  await shot(page, '09-cloud-matched-time')
  const checkbox = page.getByRole('checkbox', {
    name: 'Cloud policy: Pack replicas; preserve gangs',
    exact: true,
  })
  await checkbox.uncheck()
  await expect(clock).toHaveValue('12')
  await expect(
    page.getByRole('group', { name: /^Previous plan → new plan/ }),
  ).toBeVisible()
  await checkbox.check()
  await page
    .getByRole('button', { name: 'Observe completions', exact: true })
    .click()
  await page.getByRole('button', { name: 'Review lesson', exact: true }).click()
  const recap = page.getByRole('region', {
    name: 'Learning recap',
    exact: true,
  })
  await expect(recap).toContainText('2 training jobs, 2 tuning jobs')
  await expect(recap).toContainText('4/4 contracts verified')
  await shot(page, '10-cloud-recap')
})

test('blocked game separates configuration estimates, observed work and admission feedback', async ({
  page,
}) => {
  await page.goto('./?operation=pretrain')
  await expect(page.locator('.experience-estimate')).toContainText(
    'cannot commit work yet',
  )
  await expect(page.getByLabel('Current infrastructure scope')).toContainText(
    '64 GPU quota',
  )
  await page
    .getByRole('button', { name: 'Inspect Server state', exact: true })
    .click()
  await page
    .getByRole('button', {
      name: 'Set Training state ownership: ZeRO-3',
      exact: true,
    })
    .click()
  await expect(page.locator('.experience-option-feedback')).toContainText(
    'Admissible configuration: No → Yes',
  )
  await expect(page.locator('.campaign-game')).toHaveAttribute(
    'data-produced',
    '0',
  )
  await expect(page.locator('.experience-estimate')).toContainText(
    'Configuration estimates',
  )
  await shot(page, '11-game-admission')
})

test('guided paths reopen from help, leave fullscreen, and preserve the paused game', async ({
  page,
}) => {
  test.setTimeout(150000)
  await page.goto('./?operation=inference')
  const game = page.locator('.campaign-game'),
    gameCanvas = await page.locator('.campaign-world canvas').elementHandle()
  await page
    .getByRole('button', { name: 'Start operation', exact: true })
    .click()
  await expect
    .poll(async () => Number(await game.getAttribute('data-time')))
    .toBeGreaterThan(0.3)
  await page
    .getByRole('button', { name: 'Campaign instructions', exact: true })
    .click()
  const elapsed = await game.getAttribute('data-time')
  await page
    .getByRole('button', {
      name: 'Start lesson: Follow one API request',
      exact: true,
    })
    .click()
  const fullscreen = await page.evaluate(() => document.fullscreenEnabled)
  if (fullscreen) {
    await page
      .getByRole('button', { name: 'Fullscreen learning world', exact: true })
      .click()
    await expect
      .poll(() => page.evaluate(() => !!document.fullscreenElement))
      .toBe(true)
  }
  await page
    .getByRole('button', { name: 'Learning controls and help', exact: true })
    .click()
  await page
    .getByRole('button', {
      name: 'Start lesson: Run a cloud for model providers',
      exact: true,
    })
    .click()
  await expect
    .poll(() => page.evaluate(() => !!document.fullscreenElement))
    .toBe(false)
  await expect(
    page.getByRole('slider', { name: 'Cloud replay time', exact: true }),
  ).toHaveValue('12')
  await page
    .getByRole('button', {
      name: 'Fleet Command Play the infrastructure game',
      exact: true,
    })
    .click()
  await expect(game).toHaveAttribute('data-phase', 'inference')
  await expect(game).toHaveAttribute('data-status', 'paused')
  await expect(game).toHaveAttribute('data-time', elapsed!)
  expect(
    await page
      .locator('.campaign-world canvas')
      .evaluate((el, old) => el === old, gameCanvas),
  ).toBe(true)
})

test('game navigation labels and scope remain reachable on narrow phones and landscape', async ({
  page,
}) => {
  test.setTimeout(180000)
  for (const query of ['operation=pretrain', 'scenario=cloud-provider']) {
    await page.goto(`./?${query}`)
    for (const viewport of [
      { width: 390, height: 844 },
      { width: 320, height: 720 },
      { width: 844, height: 390 },
    ]) {
      await page.setViewportSize(viewport)
      await reachable(
        page.getByRole('button', { name: 'Learning mode', exact: true }),
      )
      await reachable(page.getByLabel('Game scenario', { exact: true }))
      await expect(
        page
          .locator(
            viewport.width <= 700
              ? '.experience-role-short'
              : '.experience-role-long',
          )
          .first(),
      ).toBeVisible()
      await expect(
        page.getByLabel('Current infrastructure scope'),
      ).toBeInViewport({ ratio: 1 })
      await expect
        .poll(() =>
          page.evaluate(() => {
            const panel = document
                .querySelector('.campaign-panel')!
                .getBoundingClientRect(),
              dock = document
                .querySelector('.campaign-dock')!
                .getBoundingClientRect()
            return panel.bottom < dock.top
          }),
        )
        .toBe(true)
      await shot(
        page,
        `15-${query.startsWith('operation') ? 'model' : 'cloud'}-navigation-${viewport.width}`,
      )
    }
  }
})
