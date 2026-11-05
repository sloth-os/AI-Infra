import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import { hotIssues } from '../src/issues/catalog'
const canvas = '.learning-world canvas'
const study = (page: Page) => page.getByTestId('hot-issues-study')
const nav = (page: Page) =>
  page.getByRole('navigation', { name: 'Learning workspace navigation' })
const metrics = (page: Page) => page.getByLabel('Hot issue experiment metrics')
async function open(page: Page, query = 'hot=all') {
  await page.goto(`/?view=guide&learn=fusion&${query}`)
  await expect(page.locator(canvas)).toHaveAttribute(
    'data-motion-mode',
    'hot-issues',
  )
  await expect(study(page)).toBeVisible()
}
async function topic(page: Page, index: number) {
  await page
    .getByRole('button', {
      name: `Hot issue ${index + 1}: ${hotIssues[index].title}`,
      exact: true,
    })
    .click()
  await expect(page.locator(canvas)).toHaveAttribute(
    'data-hot-issue',
    hotIssues[index].id,
  )
}
async function experiment(page: Page) {
  await study(page)
    .getByRole('button', { name: 'Experiment', exact: true })
    .click()
}

test('ten researched issues share the existing world, with ten distinct selectable 3D stations', async ({
  page,
}) => {
  test.setTimeout(140000)
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('/?view=explore')
  await page
    .getByRole('button', { name: 'Pause timeline', exact: true })
    .click()
  const original = await page.locator(canvas).elementHandle()
  const time = await page
    .getByTestId('infrastructure-scene')
    .getAttribute('data-motion-time')
  await nav(page)
    .getByRole('button', { name: 'Hot issues', exact: true })
    .click()
  await expect(page.locator('.issue-catalog > button')).toHaveCount(10)
  await expect(page.locator('.issue-topic-dock > button')).toHaveCount(10)
  await expect(page.locator('.learning-world .scene-label')).toHaveCount(10)
  await expect(study(page)).toContainText('editorial priority')
  for (let index = 0; index < 10; index++) {
    await topic(page, index)
    await expect(page.locator('.issue-scope h1')).toHaveText(
      hotIssues[index].title,
    )
    await expect(study(page)).toContainText(hotIssues[index].openQuestion)
    await expect(page.locator('.learn-metrics')).toBeHidden()
    expect(
      await page.locator(canvas).evaluate((el, old) => el === old, original),
    ).toBe(true)
  }
  await expect(page.getByTestId('infrastructure-scene')).toHaveAttribute(
    'data-motion-time',
    time!,
  )
  await nav(page)
    .getByRole('button', { name: 'AI lifecycle', exact: true })
    .click()
  await expect(page.locator(canvas)).toHaveAttribute(
    'data-motion-mode',
    'lifecycle',
  )
  await expect(page).not.toHaveURL(/issue=/)
  await nav(page)
    .getByRole('button', { name: 'Real models', exact: true })
    .click()
  await expect(page.locator('.model-catalog-card')).toHaveCount(6)
  await nav(page)
    .getByRole('button', { name: 'Hot issues', exact: true })
    .click()
  await page
    .getByRole('button', {
      name: 'Return from hot issues to infrastructure',
      exact: true,
    })
    .click()
  await expect(page.locator(canvas)).toHaveAttribute(
    'data-motion-mode',
    'requests',
  )
  await expect(page).not.toHaveURL(/issue=|hot_/)
  await expect(page.locator('.learn-metrics')).toBeVisible()
  expect(
    await page.locator(canvas).evaluate((el, old) => el === old, original),
  ).toBe(true)
  expect(errors).toEqual([])
})

test('interactive experiments update calculated and 3D state while showing intervention costs', async ({
  page,
}) => {
  test.setTimeout(110000)
  await open(page, 'issue=kv-memory&hot_panel=lab')
  await expect(page.locator(canvas)).toHaveAttribute(
    'data-camera-view',
    'focus',
  )
  await expect(metrics(page)).toContainText('160 GiB')
  await page
    .getByRole('checkbox', { name: 'Apply issue intervention', exact: true })
    .check()
  await expect(metrics(page)).toContainText('80 GiB')
  await expect(metrics(page)).toContainText('64 / 64')
  await page
    .getByRole('slider', {
      name: 'Reserved positions per sequence',
      exact: true,
    })
    .fill('16384')
  await expect(metrics(page)).toContainText('160 GiB')
  await topic(page, 7)
  await experiment(page)
  await expect(metrics(page)).toContainText('Free GPU slots16 GPUs')
  await expect(metrics(page)).toContainText('Feasible node-local groups0')
  await page
    .getByRole('checkbox', { name: 'Apply issue intervention', exact: true })
    .check()
  await expect(metrics(page)).toContainText('Feasible node-local groups2')
  await expect(metrics(page)).toContainText('Free GPU slots16 GPUs')
  await topic(page, 4)
  await experiment(page)
  await page
    .getByRole('slider', { name: 'Conditional draft acceptance', exact: true })
    .fill('0')
  await page
    .getByRole('checkbox', { name: 'Apply issue intervention', exact: true })
    .check()
  await expect(metrics(page)).toContainText('29 ms')
  await expect(study(page).locator('.issue-result-note')).toContainText(
    'slower',
  )
  await topic(page, 9)
  await experiment(page)
  await expect(metrics(page)).toContainText('Illustrative resident blocks72')
  await page
    .getByRole('checkbox', { name: 'Apply issue intervention', exact: true })
    .check()
  await expect(metrics(page)).toContainText('Illustrative resident blocks128')
  await expect(study(page)).toContainText(
    'client-selected salts alone are not authorization',
  )
})

test('the dated primary-source record explains selection and scope in an accessible reader', async ({
  page,
}) => {
  await open(page, 'issue=moe')
  await study(page)
    .getByRole('button', { name: 'Evidence', exact: true })
    .click()
  await expect(study(page).locator('.issue-sources a')).toHaveCount(1)
  await expect(study(page).locator('.issue-sources a')).toHaveAttribute(
    'href',
    /DeepEP\/blob\/[a-f0-9]{40}\/README.md/,
  )
  await expect(study(page)).toContainText('Snapshot 2026-10-21')
  await study(page)
    .getByRole('button', { name: 'Selection & evidence', exact: true })
    .click()
  const dialog = page.getByRole('dialog', {
    name: 'Top ten AI infrastructure issues',
    exact: true,
  })
  await expect(dialog).toBeVisible()
  await expect(dialog.locator('.issue-sources a')).toHaveCount(18)
  await expect(dialog.locator('tbody tr')).toHaveCount(10)
  await expect(dialog).toContainText('not a measured popularity chart')
  await expect(dialog).toContainText('does not claim to reproduce NVFP4')
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
})

test('shared project-path links retain assumptions after reload and clear incompatible lesson queries', async ({
  page,
}) => {
  test.setTimeout(85000)
  await open(
    page,
    'issue=placement&hot_panel=lab&example=kimi-k3&ex_tokens=20&lifecycle=inference&lc_stage=5',
  )
  await page
    .getByRole('checkbox', { name: 'Apply issue intervention', exact: true })
    .check()
  await page
    .getByRole('slider', { name: 'Initially free GPUs per node', exact: true })
    .fill('6')
  await page
    .getByRole('button', { name: 'Share hot issue', exact: true })
    .click()
  await expect(page).toHaveURL(/issue=placement/)
  await expect(page).toHaveURL(/hot_free=6/)
  await expect(page).not.toHaveURL(/example=|ex_|lifecycle=|lc_/)
  await page.reload()
  await expect(
    page.getByRole('checkbox', {
      name: 'Apply issue intervention',
      exact: true,
    }),
  ).toBeChecked()
  await expect(
    page.getByRole('slider', {
      name: 'Initially free GPUs per node',
      exact: true,
    }),
  ).toHaveValue('6')
  await expect(metrics(page)).toContainText('Feasible node-local groups3')
  await nav(page)
    .getByRole('button', { name: 'AI lifecycle', exact: true })
    .click()
  await expect(page).not.toHaveURL(/issue=|hot_/)
  await expect(page).toHaveURL(/lifecycle=pretrain/)
})

test('ten-topic keyboard shortcuts, focus, tour and cinema preserve the base simulation clock', async ({
  page,
}) => {
  test.setTimeout(110000)
  await open(page)
  const time = await page
    .getByTestId('infrastructure-scene')
    .getAttribute('data-motion-time')
  await page.keyboard.press('0')
  await expect(page.locator(canvas)).toHaveAttribute('data-issue-stage', '9')
  await page.keyboard.press('ArrowLeft')
  await expect(page.locator(canvas)).toHaveAttribute('data-issue-stage', '8')
  await page.keyboard.press('1')
  await page
    .getByRole('button', { name: 'Focus hot issue', exact: true })
    .click()
  await expect(study(page)).toBeHidden()
  await expect(page.locator(canvas)).toHaveAttribute(
    'data-camera-view',
    'focus',
  )
  await page
    .getByRole('button', { name: 'Play hot issues tour', exact: true })
    .click()
  await expect(page.locator(canvas)).not.toHaveAttribute(
    'data-issue-stage',
    '0',
    { timeout: 35000 },
  )
  await page
    .getByRole('button', { name: 'Pause hot issues tour', exact: true })
    .click()
  const stage = await page.locator(canvas).getAttribute('data-issue-stage')
  await page
    .getByRole('button', { name: 'Learning cinema mode', exact: true })
    .click()
  await page
    .getByRole('button', { name: 'Play hot issues tour', exact: true })
    .click()
  await expect(page.locator(canvas)).not.toHaveAttribute(
    'data-issue-stage',
    stage!,
    { timeout: 35000 },
  )
  await page
    .getByRole('button', { name: 'Pause hot issues tour', exact: true })
    .click()
  await page.getByRole('button', { name: /Show learning controls/ }).click()
  await expect(page.getByTestId('infrastructure-scene')).toHaveAttribute(
    'data-motion-time',
    time!,
  )
})

test('the ten-topic mobile dock and reader clear navigation and camera controls at narrow and tablet widths', async ({
  page,
}) => {
  test.setTimeout(85000)
  await page.setViewportSize({ width: 390, height: 844 })
  await open(page, 'issue=disaggregation')
  await page
    .getByRole('button', { name: 'Hide hot issue details', exact: true })
    .click()
  await topic(page, 5)
  await page
    .getByRole('button', { name: 'Show hot issue details', exact: true })
    .click()
  await expect(study(page)).toBeVisible()
  for (const [width, height] of [
    [320, 720],
    [390, 844],
    [760, 1024],
  ]) {
    await page.setViewportSize({ width, height })
    const layout = await page.evaluate(() => {
      const box = (s: string) =>
        document.querySelector(s)!.getBoundingClientRect()
      return {
        overflow: document.documentElement.scrollWidth > innerWidth,
        activeVisible:
          box('.learn-header nav button[aria-current]').left >=
            box('.learn-header nav').left &&
          box('.learn-header nav button[aria-current]').right <=
            box('.learn-header nav').right,
        overlap:
          box('.learn-header nav').right > box('.learn-header-tools').left,
        panelBottom: box('.learn-panel').bottom,
        dockTop: box('.issue-command-deck').top,
        metricsBottom: box('.issue-world-readouts').bottom,
        cameraTop: box('.learn-camera').top,
      }
    })
    expect(layout.activeVisible).toBe(true)
    expect(layout.overflow).toBe(false)
    expect(layout.overlap).toBe(false)
    expect(layout.panelBottom).toBeLessThan(layout.dockTop)
    if (width < 700) expect(layout.metricsBottom).toBeLessThan(layout.cameraTop)
  }
})

async function noWebGL(page: Page) {
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
}
test('reduced motion and WebGL fallback retain all ten topics, calculations and evidence', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await noWebGL(page)
  await page.goto('/?view=guide&learn=fusion&hot=all')
  await expect(page.locator('.issue-fallback')).toBeVisible()
  await expect(page.locator('.issue-fallback button')).toHaveCount(10)
  await expect(
    page.getByRole('button', { name: 'Play hot issues tour', exact: true }),
  ).toBeDisabled()
  await page.getByRole('button', { name: /Hot issue 10:/ }).click()
  await expect(page.getByTestId('infrastructure-scene')).toHaveAttribute(
    'data-hot-issue',
    'isolation',
  )
  await experiment(page)
  await page
    .getByRole('checkbox', { name: 'Apply issue intervention', exact: true })
    .check()
  await expect(metrics(page)).toContainText('128')
  await study(page)
    .getByRole('button', { name: 'Evidence', exact: true })
    .click()
  await expect(study(page).locator('.issue-sources a')).toHaveCount(2)
})

test('fallback playback uses the same five-second ten-topic wraparound without WebGL', async ({
  page,
}) => {
  await noWebGL(page)
  await page.clock.install()
  await page.goto('/?view=guide&learn=fusion&issue=isolation')
  await expect(page.locator('.issue-fallback')).toBeVisible()
  await page
    .getByRole('button', { name: 'Play hot issues tour', exact: true })
    .click()
  await page.clock.fastForward(5100)
  await expect(page.getByTestId('infrastructure-scene')).toHaveAttribute(
    'data-issue-stage',
    '0',
  )
  await page
    .getByRole('button', { name: 'Pause hot issues tour', exact: true })
    .click()
  await page.clock.fastForward(20000)
  await expect(page.getByTestId('infrastructure-scene')).toHaveAttribute(
    'data-issue-stage',
    '0',
  )
})
