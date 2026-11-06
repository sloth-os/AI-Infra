import { test, expect } from '@playwright/test'
import { hotIssues } from '../src/issues/catalog'
import {
  browse,
  canvas,
  level,
  metrics,
  noWebGL,
  open,
} from './connected-helpers'
const study = (page: import('@playwright/test').Page) =>
  page.getByTestId('hot-issues-study')

test('all ten issues attach to the current accelerator and selecting another issue preserves the physical world', async ({
  page,
}) => {
  test.setTimeout(140000)
  await open(page, 'hot=all&level=gpu')
  await expect(page.locator('.issue-catalog > button')).toHaveCount(10)
  const original = await page.locator(canvas).elementHandle(),
    hardware = await page
      .locator(canvas)
      .getAttribute('data-hardware-instances')
  for (const issue of hotIssues) {
    await page
      .getByRole('combobox', { name: 'Select hot issue', exact: true })
      .selectOption(String(hotIssues.indexOf(issue)))
    await expect(page.locator(canvas)).toHaveAttribute(
      'data-context-id',
      issue.id,
    )
    await expect(page.locator(canvas)).toHaveAttribute(
      'data-motion-layer',
      'gpu',
    )
    await expect(page.locator(canvas)).toHaveAttribute(
      'data-world-kind',
      'infrastructure',
    )
    await expect(page.locator(canvas)).toHaveAttribute(
      'data-hardware-instances',
      hardware!,
    )
    await expect(page.getByTestId('context-perspective')).toContainText(
      issue.title,
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
  await expect(page.locator('[id^="issue-stage-"]')).toHaveCount(0)
})

test('KV assumptions persist across all four levels while budgets and HBM glyph occupancy update together', async ({
  page,
}) => {
  test.setTimeout(110000)
  await open(page, 'issue=kv-memory&level=gpu&hot_panel=lab')
  await expect(metrics(page)).toContainText('160 GiB')
  await expect(page.locator(canvas)).toHaveAttribute(
    'data-context-glyphs',
    '64',
  )
  await page
    .getByRole('checkbox', { name: 'Apply issue intervention', exact: true })
    .check()
  await expect(metrics(page)).toContainText('80 GiB')
  await expect(page.locator(canvas)).toHaveAttribute(
    'data-context-glyphs',
    '32',
  )
  for (const id of ['fleet', 'pod', 'rack', 'gpu']) {
    await level(page, id)
    await expect(metrics(page)).toContainText('80 GiB')
    await expect(
      page.getByRole('checkbox', {
        name: 'Apply issue intervention',
        exact: true,
      }),
    ).toBeChecked()
    await expect(page.getByTestId('context-perspective')).toContainText(
      id === 'rack' ? 'SERVER' : id.toUpperCase(),
    )
  }
  await page
    .getByRole('slider', {
      name: 'Reserved positions per sequence',
      exact: true,
    })
    .fill('16384')
  await expect(metrics(page)).toContainText('160 GiB')
  await page
    .getByRole('button', { name: 'Share hot issue', exact: true })
    .click()
  await expect(page).toHaveURL(/view=explore/)
  await expect(page).toHaveURL(/level=gpu/)
  await page.reload()
  await expect(
    page.getByRole('slider', {
      name: 'Reserved positions per sequence',
      exact: true,
    }),
  ).toHaveValue('16384')
})

test('placement, speculative decoding and tenant isolation retain visible counterexamples on real hardware', async ({
  page,
}) => {
  test.setTimeout(100000)
  await open(page, 'issue=placement&level=server&hot_panel=lab')
  await expect(metrics(page)).toContainText('Feasible node-local groups0')
  await page
    .getByRole('checkbox', { name: 'Apply issue intervention', exact: true })
    .check()
  await expect(metrics(page)).toContainText('Feasible node-local groups2')
  await expect(metrics(page)).toContainText('16 GPUs')
  await expect(page.locator(canvas)).toHaveAttribute('data-context-glyphs', '8')
  await page
    .getByRole('combobox', { name: 'Select hot issue', exact: true })
    .selectOption('4')
  await study(page)
    .getByRole('button', { name: 'Experiment', exact: true })
    .click()
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
  await page
    .getByRole('combobox', { name: 'Select hot issue', exact: true })
    .selectOption('9')
  await study(page)
    .getByRole('button', { name: 'Experiment', exact: true })
    .click()
  await expect(metrics(page)).toContainText('resident blocks72')
  await page
    .getByRole('checkbox', { name: 'Apply issue intervention', exact: true })
    .check()
  await expect(metrics(page)).toContainText('resident blocks128')
  await expect(study(page)).toContainText(
    'client-selected salts alone are not authorization',
  )
})

test('per-level connections mix issues, lifecycle and real workloads; the dated source record explains editorial selection', async ({
  page,
}) => {
  await open(page, 'issue=moe&level=pod')
  await browse(page)
  await expect(
    page.getByRole('button', { name: /^Explore issue:/ }),
  ).not.toHaveCount(0)
  await expect(
    page.getByRole('button', { name: /^Explore lifecycle:/ }),
  ).toHaveCount(3)
  await expect(
    page.getByRole('button', { name: /^Explore model:/ }),
  ).toHaveCount(6)
  await page.getByRole('button', { name: /^Explore issue: MoE/ }).click()
  await study(page)
    .getByRole('button', { name: 'Evidence', exact: true })
    .click()
  await expect(study(page).locator('.issue-sources a')).toHaveCount(1)
  await expect(study(page)).toContainText('Snapshot 2026-10-21')
  await study(page)
    .getByRole('button', { name: 'Selection & evidence', exact: true })
    .click()
  const dialog = page.getByRole('dialog', {
    name: 'Top ten AI infrastructure issues',
    exact: true,
  })
  await expect(dialog.locator('.issue-sources a')).toHaveCount(18)
  await expect(dialog.locator('tbody tr')).toHaveCount(10)
  await expect(dialog).toContainText('not a measured popularity chart')
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
})

test('issue playback travels through physical levels, preserves its intervention, and never advances the base clock', async ({
  page,
}) => {
  test.setTimeout(90000)
  await open(page, 'issue=power&level=fleet&hot_panel=lab')
  const time = await page
    .getByTestId('infrastructure-scene')
    .getAttribute('data-motion-time')
  await page
    .getByRole('checkbox', { name: 'Apply issue intervention', exact: true })
    .check()
  await page
    .getByRole('button', { name: 'Play connected walkthrough', exact: true })
    .click()
  await expect(page.locator(canvas)).not.toHaveAttribute(
    'data-motion-layer',
    'fleet',
    { timeout: 30000 },
  )
  await page
    .getByRole('button', { name: 'Pause connected walkthrough', exact: true })
    .click()
  await expect(
    page.getByRole('checkbox', {
      name: 'Apply issue intervention',
      exact: true,
    }),
  ).toBeChecked()
  await expect(page.locator(canvas)).toHaveAttribute('data-context-id', 'power')
  await page.keyboard.press('4')
  await expect(page.locator(canvas)).toHaveAttribute('data-motion-layer', 'gpu')
  await page.keyboard.press('f')
  await expect(page.locator(canvas)).toHaveAttribute(
    'data-camera-view',
    'focus',
  )
  await expect(page.getByTestId('infrastructure-scene')).toHaveAttribute(
    'data-motion-time',
    time!,
  )
})

test('connected mobile details, scale controls and camera stay reachable; fallback retains the same hierarchy', async ({
  page,
}) => {
  test.setTimeout(90000)
  await page.setViewportSize({ width: 390, height: 844 })
  await open(page, 'issue=precision&level=gpu')
  for (const [width, height] of [
    [320, 720],
    [390, 844],
    [320, 600],
    [390, 480],
    [760, 1024],
  ]) {
    await page.setViewportSize({ width, height })
    const layout = () =>
      page.evaluate(() => {
        const b = (s: string) =>
          document.querySelector(s)!.getBoundingClientRect()
        return {
          overflow: document.documentElement.scrollWidth > innerWidth,
          nav: b('.learn-header nav').right <= b('.learn-header-tools').left,
          panel: b('.learn-panel').bottom < b('.learn-command-deck').top,
          rail: b('.learn-scale-rail').bottom < b('.learn-command-deck').top,
          dock: b('.learn-command-deck').bottom <= innerHeight,
          camera: b('.learn-camera').bottom < b('.learn-command-deck').top,
        }
      })
    await expect.poll(layout).toEqual({
      overflow: false,
      nav: true,
      panel: true,
      rail: true,
      dock: true,
      camera: true,
    })
  }
  await page
    .getByRole('button', { name: 'Hide connected details', exact: true })
    .click()
  await expect(study(page)).toBeHidden()
  await level(page, 'rack')
  await expect(page.locator(canvas)).toHaveAttribute(
    'data-context-id',
    'precision',
  )
  await page
    .getByRole('button', { name: 'Show connected details', exact: true })
    .click()
  await expect(study(page)).toBeVisible()
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await noWebGL(page)
  await page.reload()
  await expect(page.locator('.fallback-topology')).toBeVisible()
  await expect(page.locator('.issue-fallback')).toHaveCount(0)
  await expect(
    page.getByRole('button', {
      name: 'Play connected walkthrough',
      exact: true,
    }),
  ).toBeDisabled()
})
