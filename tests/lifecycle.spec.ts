import { test, expect } from '@playwright/test'
import {
  browse,
  canvas,
  level,
  metrics,
  noWebGL,
  open,
  step,
} from './connected-helpers'
const study = (page: import('@playwright/test').Page) =>
  page.getByTestId('lifecycle-study')

test('pre-training, post-training and inference all inhabit fleet, pod, server and GPU without replacing hardware', async ({
  page,
}) => {
  test.setTimeout(180000)
  await open(page, 'lifecycle=pretrain')
  const original = await page.locator(canvas).elementHandle()
  for (const [phase, title] of [
    ['pretrain', 'Pre-training'],
    ['posttrain', 'Post-training'],
    ['inference', 'Inference'],
  ]) {
    await study(page)
      .getByRole('button', { name: new RegExp(title) })
      .click()
    await expect(page.locator(canvas)).toHaveAttribute(
      'data-context-id',
      new RegExp('^' + phase + ':'),
    )
    await expect(page.locator('.context-steps button')).toHaveCount(6)
    for (const id of ['fleet', 'pod', 'rack', 'gpu']) {
      await level(page, id)
      await expect(page.locator(canvas)).toHaveAttribute(
        'data-world-kind',
        'infrastructure',
      )
      await expect(page.getByTestId('context-perspective')).toContainText(title)
      expect(
        await page.locator(canvas).evaluate((el, old) => el === old, original),
      ).toBe(true)
    }
  }
  await page
    .getByRole('button', { name: 'Clear connected story', exact: true })
    .click()
  await expect(page.locator(canvas)).toHaveAttribute('data-context-kind', '')
  await expect(page.locator(canvas)).toHaveAttribute('data-motion-layer', 'gpu')
  await browse(page)
  await page
    .getByRole('button', { name: 'Explore model: Kimi K3', exact: true })
    .click()
  await page.getByRole('button', { name: 'Top down', exact: true }).click()
  await browse(page)
  await page
    .getByRole('button', {
      name: 'Explore lifecycle: Pre-training',
      exact: true,
    })
    .click()
  await expect(page.locator(canvas)).toHaveAttribute('data-camera-view', 'top')
})

test('training sizing links state sharding and global token accounting to schedule annotations on the actual server', async ({
  page,
}) => {
  await open(page, 'lifecycle=pretrain&lc_stage=3&level=server')
  await page.getByRole('button', { name: 'Sizing lab', exact: true }).click()
  await expect(metrics(page)).toContainText('16.3 GiB')
  await expect(metrics(page)).toContainText('262,144')
  await expect(page.locator(canvas)).toHaveAttribute('data-context-glyphs', '8')
  await page
    .getByRole('combobox', { name: 'Training state strategy', exact: true })
    .selectOption('ddp')
  await expect(metrics(page)).toContainText('130.39 GiB')
  await page
    .getByRole('combobox', { name: 'Pipeline stages', exact: true })
    .selectOption('4')
  await expect(metrics(page)).toContainText('128')
  await expect(page.locator('.life-schedule > div')).toHaveCount(4)
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
})

test('SFT masking, DPO reference objectives and GRPO groups retain independent controls and shared versioned state', async ({
  page,
}) => {
  test.setTimeout(110000)
  await open(page, 'lifecycle=posttrain&level=gpu')
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
    .fill('3')
  expect(await page.getByTestId('dpo-loss').innerText()).not.toBe(loss)
  await page
    .getByRole('combobox', { name: 'Post-training method', exact: true })
    .selectOption('grpo')
  await page
    .getByRole('combobox', { name: 'Completions per prompt', exact: true })
    .selectOption('8')
  await page
    .getByRole('checkbox', {
      name: 'Give every completion the same reward',
      exact: true,
    })
    .check()
  await expect(page.locator('.life-reward-grid')).toContainText('0.00')
  await level(page, 'rack')
  await expect(
    page.getByRole('combobox', { name: 'Completions per prompt', exact: true }),
  ).toHaveValue('8')
  await page
    .getByRole('button', { name: 'Share lifecycle experiment', exact: true })
    .click()
  await expect(page).toHaveURL(/level=server/)
  await expect(page).toHaveURL(/lc_group=8/)
  await page.reload()
  await page.getByRole('button', { name: 'Sizing lab', exact: true }).click()
  await expect(
    page.getByRole('checkbox', {
      name: 'Give every completion the same reward',
      exact: true,
    }),
  ).toBeChecked()
})

test('inference keeps KV local until split serving is selected and ties the fabric annotation to the same wire calculation', async ({
  page,
}) => {
  test.setTimeout(100000)
  await open(page, 'lifecycle=inference&level=pod')
  await page.getByRole('button', { name: 'Sizing lab', exact: true }).click()
  await expect(metrics(page)).toContainText('12,500')
  await expect(metrics(page)).toContainText('45 GiB')
  await expect(metrics(page)).toContainText('0 bytes')
  await expect(page.locator(canvas)).toHaveAttribute(
    'data-context-pattern',
    'tokens',
  )
  await page
    .getByRole('checkbox', {
      name: 'Disaggregate prefill and decode',
      exact: true,
    })
    .check()
  await expect(metrics(page)).toContainText('19.17')
  await expect(page.locator(canvas)).toHaveAttribute(
    'data-context-pattern',
    'transfer',
  )
  await page
    .getByRole('combobox', {
      name: 'Handoff endpoint bandwidth (Gb/s)',
      exact: true,
    })
    .selectOption('200')
  await expect(metrics(page)).toContainText('38.35')
  await page
    .getByRole('spinbutton', {
      name: 'Concurrent sequences per group',
      exact: true,
    })
    .fill('128')
  await expect(metrics(page)).toContainText('90 GiB')
  await page
    .getByRole('button', { name: 'Compare all three', exact: true })
    .click()
  const dialog = page.getByRole('dialog', {
    name: 'Pre-training, post-training and inference',
    exact: true,
  })
  await expect(dialog.locator('.life-comparison-grid > article')).toHaveCount(3)
  await expect(dialog).toContainText('PPO-based RLHF')
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
})

test('native lifecycle steps, scale shortcuts and playback follow real levels without advancing the base request clock', async ({
  page,
}) => {
  test.setTimeout(100000)
  await open(page, 'lifecycle=pretrain')
  const time = await page
    .getByTestId('infrastructure-scene')
    .getAttribute('data-motion-time')
  await page.keyboard.press('3')
  await expect(page.locator(canvas)).toHaveAttribute(
    'data-motion-layer',
    'rack',
  )
  await expect(page.locator(canvas)).toHaveAttribute('data-context-stage', '3')
  await page.keyboard.press('ArrowRight')
  await expect(page.locator(canvas)).toHaveAttribute('data-motion-layer', 'pod')
  await expect(page.locator(canvas)).toHaveAttribute('data-context-stage', '4')
  await step(page, 0)
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
  await expect(page.getByTestId('infrastructure-scene')).toHaveAttribute(
    'data-motion-time',
    time!,
  )
})

test('lifecycle evidence and calculations remain available on the physical topology fallback with reduced motion', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await noWebGL(page)
  await page.goto(
    '/?view=explore&learn=fusion&lifecycle=inference&level=server',
  )
  await expect(page.locator('.fallback-topology')).toBeVisible()
  await expect(page.locator('.life-fallback')).toHaveCount(0)
  await expect(
    page.getByRole('button', {
      name: 'Play connected walkthrough',
      exact: true,
    }),
  ).toBeDisabled()
  await page
    .getByRole('navigation', { name: 'Infrastructure scale' })
    .getByRole('button', { name: /^2 Pod / })
    .click()
  await expect(page.getByTestId('infrastructure-scene')).toHaveAttribute(
    'data-motion-layer',
    'pod',
  )
  await page.getByRole('button', { name: 'Sizing lab', exact: true }).click()
  await page
    .getByRole('checkbox', {
      name: 'Disaggregate prefill and decode',
      exact: true,
    })
    .check()
  await expect(metrics(page)).toContainText('19.17')
  await page.getByRole('button', { name: 'Evidence', exact: true }).click()
  await expect(page.locator('.model-source-list a')).toHaveCount(19)
})
