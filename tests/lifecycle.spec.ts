import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
const canvas = '.learning-world canvas'
const nav = (page: Page) =>
  page.getByRole('navigation', { name: 'Learning workspace navigation' })
const scope = (page: Page) => page.locator('.life-scope')
async function open(page: Page, phase = 'pretrain', query = '') {
  await page.goto(`/?view=guide&learn=fusion&lifecycle=${phase}${query}`)
  await expect(page.locator(canvas)).toHaveAttribute(
    'data-lifecycle-phase',
    phase,
  )
  await expect(page.getByTestId('lifecycle-study')).toBeVisible()
}

test('the three lifecycle workflows and post-training recipes share one canvas with six selectable stages', async ({
  page,
}) => {
  test.setTimeout(100000)
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('/?view=explore')
  const original = await page.locator(canvas).elementHandle()
  await nav(page)
    .getByRole('button', { name: 'AI lifecycle', exact: true })
    .click()
  for (const [phase, title] of [
    ['pretrain', 'Pre-training'],
    ['posttrain', 'Post-training'],
    ['inference', 'Inference'],
  ]) {
    await scope(page)
      .getByRole('button', { name: new RegExp(title) })
      .click()
    await expect(page.locator(canvas)).toHaveAttribute(
      'data-lifecycle-phase',
      phase,
    )
    await expect(scope(page).locator('h1')).toHaveText(title)
    await expect(page.locator('.model-stage-dock button')).toHaveCount(6)
    await expect(page.locator('.learning-world .scene-label')).toHaveCount(6)
    await page.getByRole('button', { name: /Lifecycle stage 4:/ }).click()
    await expect(page.locator(canvas)).toHaveAttribute(
      'data-lifecycle-stage',
      '3',
    )
    await expect(page.locator('.learn-metrics')).toBeHidden()
    if (phase === 'posttrain') {
      for (const method of ['dpo', 'grpo', 'sft']) {
        await page
          .getByRole('combobox', { name: 'Post-training method', exact: true })
          .selectOption(method)
        await expect(page.locator(canvas)).toHaveAttribute(
          'data-lifecycle-method',
          method,
        )
        await expect(page.locator(canvas)).toHaveAttribute(
          'data-lifecycle-stage',
          '0',
        )
      }
    }
    expect(
      await page.locator(canvas).evaluate((el, old) => el === old, original),
    ).toBe(true)
  }
  await page
    .getByRole('button', {
      name: 'Return from lifecycle to infrastructure',
      exact: true,
    })
    .click()
  await expect(page.locator(canvas)).toHaveAttribute('data-lifecycle-phase', '')
  await expect(page).not.toHaveURL(/lifecycle=/)
  await expect(page.locator('.learn-metrics')).toBeVisible()
  await nav(page)
    .getByRole('button', { name: 'Real models', exact: true })
    .click()
  await expect(page.locator('.model-catalog-card')).toHaveCount(6)
  await page.getByRole('button', { name: /Moonshot AI.*Kimi K3/ }).click()
  await page.getByRole('button', { name: 'Top down', exact: true }).click()
  await expect(page.locator(canvas)).toHaveAttribute('data-camera-view', 'top')
  await nav(page)
    .getByRole('button', { name: 'AI lifecycle', exact: true })
    .click()
  await expect(page.locator(canvas)).toHaveAttribute(
    'data-camera-view',
    'isometric',
  )
  await expect(
    page.getByRole('button', { name: 'Isometric view', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true')
  expect(errors).toEqual([])
})

test('the training sizing lab links state sharding, batch accounting and a complete microbatch schedule', async ({
  page,
}) => {
  await open(page)
  await page.getByRole('button', { name: 'Sizing lab', exact: true }).click()
  await expect(page.locator('.model-world-readouts')).toContainText('16.3 GiB')
  await expect(page.locator('.model-world-readouts')).toContainText('262,144')
  await page
    .getByRole('combobox', { name: 'Training state strategy', exact: true })
    .selectOption('ddp')
  await expect(page.locator('.model-world-readouts')).toContainText(
    '130.39 GiB',
  )
  await page
    .getByRole('combobox', { name: 'Pipeline stages', exact: true })
    .selectOption('4')
  await expect(page.locator('.model-world-readouts')).toContainText('128')
  await expect(page.locator('.model-world-readouts')).toContainText('262,144')
  await expect(page.locator('.life-schedule > div')).toHaveCount(4)
  await expect(page.locator('.life-lab')).toContainText('27.27%')
  await page
    .getByRole('slider', { name: 'Pipeline schedule slot', exact: true })
    .fill('5')
  await expect(
    page.locator('.life-schedule [data-current="true"]'),
  ).toHaveCount(4)
  await page
    .getByRole('checkbox', { name: 'Activation checkpointing', exact: true })
    .uncheck()
  await expect(page.locator('.life-lab')).toContainText('Without recomputation')
  await page
    .getByRole('button', { name: 'Network & choices', exact: true })
    .click()
  await expect(page.locator('.life-operations')).toContainText(
    'DDP ring all-reduce',
  )
  await expect(page.locator('.life-operations')).toContainText(
    'ZeRO-3 full parameter-gather',
  )
  await page.getByRole('button', { name: 'Evidence', exact: true }).click()
  await expect(page.locator('.model-source-list a')).toHaveCount(19)
  await expect(page.locator('.model-evidence')).toContainText(
    'not train a model',
  )
})

test('post-training toys distinguish SFT masking, DPO references and equal-reward GRPO groups', async ({
  page,
}) => {
  test.setTimeout(70000)
  await open(page, 'posttrain')
  await page.getByRole('button', { name: 'Sizing lab', exact: true }).click()
  await expect(
    page.locator('.life-token-strip [data-active="true"]'),
  ).toHaveCount(2)
  await page
    .getByRole('checkbox', {
      name: 'Only assistant response targets',
      exact: true,
    })
    .uncheck()
  await expect(
    page.locator('.life-token-strip [data-active="true"]'),
  ).toHaveCount(5)
  await page
    .getByRole('combobox', { name: 'Post-training method', exact: true })
    .selectOption('dpo')
  const loss = await page.getByTestId('dpo-loss').innerText()
  await page
    .getByRole('slider', {
      name: 'Policy chosen−rejected log-prob gap',
      exact: true,
    })
    .fill('4')
  await expect(page.getByTestId('dpo-loss')).not.toHaveText(loss)
  await page
    .getByRole('combobox', { name: 'Post-training method', exact: true })
    .selectOption('grpo')
  await page
    .getByRole('combobox', { name: 'Completions per prompt', exact: true })
    .selectOption('8')
  await expect(page.locator('.life-reward-grid > div')).toHaveCount(8)
  await expect(page.locator('.model-world-readouts')).toContainText('128')
  await page
    .getByRole('checkbox', {
      name: 'Give every completion the same reward',
      exact: true,
    })
    .check()
  await expect(page.locator('.life-reward-grid strong')).toHaveText(
    Array(8).fill('A = 0.00'),
  )
  await page.getByRole('button', { name: /Lifecycle stage 5:/ }).click()
  await page
    .getByRole('button', { name: 'Share lifecycle experiment', exact: true })
    .click()
  await expect(page).toHaveURL(/lc_method=grpo/)
  await expect(page).toHaveURL(/lc_group=8/)
  await page.reload()
  await expect(page.locator(canvas)).toHaveAttribute(
    'data-lifecycle-stage',
    '4',
  )
  await expect(page.locator(canvas)).toHaveAttribute(
    'data-lifecycle-method',
    'grpo',
  )
  await page.getByRole('button', { name: 'Sizing lab', exact: true }).click()
  await expect(
    page.getByRole('combobox', { name: 'Completions per prompt', exact: true }),
  ).toHaveValue('8')
  await expect(
    page.getByRole('checkbox', {
      name: 'Give every completion the same reward',
      exact: true,
    }),
  ).toBeChecked()
})

test('inference controls keep independent fleet groups, output reservation and optional KV handoff distinct', async ({
  page,
}) => {
  await open(page, 'inference')
  await page.getByRole('button', { name: 'Sizing lab', exact: true }).click()
  await expect(page.locator('.model-world-readouts')).toContainText('12,500')
  await expect(page.locator('.model-world-readouts')).toContainText('45 GiB')
  await expect(page.locator('.model-world-readouts')).toContainText('0bytes')
  await page
    .getByRole('checkbox', {
      name: 'Disaggregate prefill and decode',
      exact: true,
    })
    .check()
  await expect(page.locator('.model-world-readouts')).toContainText('19.17')
  await page
    .getByRole('combobox', {
      name: 'Handoff endpoint bandwidth (Gb/s)',
      exact: true,
    })
    .selectOption('200')
  await expect(page.locator('.model-world-readouts')).toContainText('38.35')
  await page
    .getByRole('spinbutton', {
      name: 'Concurrent sequences per group',
      exact: true,
    })
    .fill('128')
  await expect(page.locator('.model-world-readouts')).toContainText('90 GiB')
  const prompt = page.getByRole('spinbutton', {
    name: 'Prompt tokens per sequence',
    exact: true,
  })
  await prompt.fill('')
  await prompt.pressSequentially('8192')
  await expect(prompt).toHaveValue('8192')
  await prompt.press('Tab')
  await expect(page.locator('.model-world-readouts')).toContainText('330 GiB')
  await page
    .getByRole('button', { name: 'Compare all three', exact: true })
    .click()
  const dialog = page.getByRole('dialog', {
    name: 'Pre-training, post-training and inference',
    exact: true,
  })
  await expect(dialog).toBeVisible()
  await expect(dialog.locator('.life-comparison-grid > article')).toHaveCount(3)
  await expect(dialog).toContainText('PPO-based RLHF')
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
})

test('lifecycle playback, keyboard and cinema controls operate the lesson without advancing the base request timeline', async ({
  page,
}) => {
  test.setTimeout(70000)
  await open(page)
  const baseTime = await page
    .getByTestId('infrastructure-scene')
    .getAttribute('data-motion-time')
  await page.keyboard.press('3')
  await expect(page.locator(canvas)).toHaveAttribute(
    'data-lifecycle-stage',
    '2',
  )
  await page.keyboard.press('ArrowRight')
  await expect(page.locator(canvas)).toHaveAttribute(
    'data-lifecycle-stage',
    '3',
  )
  await page
    .getByRole('button', { name: 'Play lifecycle walkthrough', exact: true })
    .click()
  await expect(page.locator(canvas)).not.toHaveAttribute(
    'data-lifecycle-stage',
    '3',
    { timeout: 20000 },
  )
  await page
    .getByRole('button', { name: 'Pause lifecycle walkthrough', exact: true })
    .click()
  const stage = await page.locator(canvas).getAttribute('data-lifecycle-stage')
  await page
    .getByRole('button', { name: 'Learning cinema mode', exact: true })
    .click()
  await page
    .getByRole('button', { name: 'Play lifecycle walkthrough', exact: true })
    .click()
  await expect(page.locator(canvas)).not.toHaveAttribute(
    'data-lifecycle-stage',
    stage!,
    { timeout: 20000 },
  )
  await page
    .getByRole('button', { name: 'Pause lifecycle walkthrough', exact: true })
    .click()
  await page.getByRole('button', { name: /Show learning controls/ }).click()
  await expect(page.getByTestId('infrastructure-scene')).toHaveAttribute(
    'data-motion-time',
    baseTime!,
  )
})

test('the lifecycle mobile UI clears navigation, camera controls and the dock and remains fully operable', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await open(page)
  await scope(page)
    .getByRole('button', { name: /Post-training/ })
    .click()
  await page
    .getByRole('combobox', { name: 'Post-training method', exact: true })
    .selectOption('grpo')
  await page.getByRole('button', { name: 'Sizing lab', exact: true }).click()
  await page
    .getByRole('combobox', { name: 'Completions per prompt', exact: true })
    .selectOption('8')
  await page
    .getByRole('button', { name: 'Hide lifecycle details', exact: true })
    .click()
  await expect(page.getByTestId('lifecycle-study')).toBeHidden()
  await page.getByRole('button', { name: /Lifecycle stage 4:/ }).click()
  await expect(page.locator(canvas)).toHaveAttribute(
    'data-lifecycle-stage',
    '3',
  )
  await page
    .getByRole('button', { name: 'Show lifecycle details', exact: true })
    .click()
  await expect(page.getByTestId('lifecycle-study')).toBeVisible()
  await page.setViewportSize({ width: 320, height: 720 })
  const layout = await page.evaluate(() => {
    const nav = document
      .querySelector('.learn-header nav')!
      .getBoundingClientRect()
    const tools = document
      .querySelector('.learn-header-tools')!
      .getBoundingClientRect()
    const panel = document
      .querySelector('.learn-panel')!
      .getBoundingClientRect()
    const dock = document
      .querySelector('.model-command-deck')!
      .getBoundingClientRect()
    return {
      overflow: document.documentElement.scrollWidth > innerWidth,
      overlap: nav.right > tools.left,
      panelBottom: panel.bottom,
      dockTop: dock.top,
      metricsBottom: document
        .querySelector('.life-world-readouts')!
        .getBoundingClientRect().bottom,
      cameraTop: document
        .querySelector('.learn-camera')!
        .getBoundingClientRect().top,
    }
  })
  expect(layout.overflow).toBe(false)
  expect(layout.overlap).toBe(false)
  expect(layout.panelBottom).toBeLessThan(layout.dockTop)
  expect(layout.metricsBottom).toBeLessThan(layout.cameraTop)
})

test('reduced-motion and WebGL fallback retain stages, research and experiments without automatic animation', async ({
  page,
}) => {
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
  await page.goto('/?view=guide&learn=fusion&lifecycle=inference&lc_stage=3')
  await expect(page.locator('.life-fallback')).toBeVisible()
  await expect(
    page.getByRole('button', {
      name: 'Play lifecycle walkthrough',
      exact: true,
    }),
  ).toBeDisabled()
  await page.getByRole('button', { name: /Lifecycle stage 6:/ }).click()
  await expect(page.getByTestId('infrastructure-scene')).toHaveAttribute(
    'data-lifecycle-stage',
    '5',
  )
  await page.getByRole('button', { name: 'Sizing lab', exact: true }).click()
  await page
    .getByRole('checkbox', {
      name: 'Disaggregate prefill and decode',
      exact: true,
    })
    .check()
  await expect(page.locator('.model-world-readouts')).toContainText('19.17')
  await page.getByRole('button', { name: 'Evidence', exact: true }).click()
  await expect(page.locator('.model-source-list a')).toHaveCount(19)
})
