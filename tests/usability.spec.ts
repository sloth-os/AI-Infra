import { test, expect } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'
import { noWebGL } from './connected-helpers'

// Visibility alone includes content clipped inside a scrolling workshop.
async function reachable(control: Locator) {
  await expect(control).toBeVisible()
  await expect(control).toBeInViewport({ ratio: 1 })
  await expect
    .poll(() =>
      control.evaluate((el) => {
        const r = el.getBoundingClientRect(),
          hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)
        return !!hit && (el.contains(hit) || hit.contains(el))
      }),
    )
    .toBe(true)
}

async function learning(page: Page, query: string) {
  await page.goto(`./?view=explore&${query}`)
  await expect(page.locator('.learning-world canvas')).toBeVisible()
}

for (const viewport of [
  { width: 1366, height: 768 },
  { width: 390, height: 844 },
]) {
  test(`cloud policies are discoverable before scrolling at ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport)
    await page.goto('./?scenario=cloud-provider')
    const policies = [
      'Fair quota + idle borrowing',
      'Weighted transfer queues',
      'Pack replicas; preserve gangs',
      'VM + dedicated GPU leases',
    ]
    for (const [i, label] of policies.entries()) {
      await page
        .getByRole('button', {
          name: `${i + 1} ${['Fleet', 'Pod', 'Server', 'GPU'][i]} game level`,
          exact: true,
        })
        .click()
      const policy = page.getByRole('button', {
        name: `Install ${label}`,
        exact: true,
      })
      await reachable(policy)
      await policy.click()
      await expect(policy).toHaveAttribute('aria-pressed', 'true')
    }
    const inspect = page.getByText('Inspect physical allocation', {
      exact: true,
    })
    await inspect.click()
    await page
      .getByRole('combobox', { name: 'Inspect cloud server', exact: true })
      .selectOption('2')
    await page.getByRole('button', { name: /^Inspect GPU 3:/ }).click()
    await expect(
      page.getByRole('button', { name: /^Inspect GPU 3:/ }),
    ).toHaveAttribute('aria-pressed', 'true')
  })
}

test('blocked-memory guidance focuses the actual decision without purchasing or running work', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1366, height: 768 })
  for (const [phase, label, decision] of [
    ['pretrain', 'Inspect Server state', 'state'],
    ['inference', 'Inspect GPU memory', 'precision'],
  ]) {
    await page.goto(`./?operation=${phase}`)
    if (phase === 'inference') {
      await page
        .getByRole('button', { name: '3 Server game level', exact: true })
        .click()
      await page
        .getByRole('button', {
          name: 'Set Sequences per replica: 64 sequences',
          exact: true,
        })
        .click()
      await page
        .getByRole('button', { name: '1 Fleet game level', exact: true })
        .click()
    }
    const credits = page
        .locator('.campaign-score > div')
        .first()
        .locator('strong'),
      before = await credits.textContent()
    await page.getByRole('button', { name: label, exact: true }).click()
    const target = page.locator(`[data-decision="${decision}"]`)
    await expect(target).toBeFocused()
    await reachable(target.locator('button').first())
    await expect(credits).toHaveText(before!)
    await expect(page.locator('.campaign-game')).toHaveAttribute(
      'data-produced',
      '0',
    )
    await expect(page.locator('.campaign-game')).toHaveAttribute(
      'data-time',
      '0.00',
    )
    await page
      .getByRole('button', { name: 'Configure this level', exact: true })
      .click()
    await expect(page.locator('.campaign-decision').first()).toBeFocused()
  }
})

test('connected readers expose story controls and preserve expandable explanations on phones', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  for (const [query, control] of [
    ['example=qwen-image-21&level=gpu', 'Select real model'],
    ['provider=cloud&level=server', 'Capacity lab'],
    ['lifecycle=posttrain&level=gpu', 'Sizing lab'],
  ]) {
    await learning(page, query)
    const action =
      control === 'Select real model'
        ? page.getByRole('combobox', { name: control, exact: true })
        : page.getByRole('button', { name: control, exact: true })
    await reachable(action)
    const explanation = page
      .getByTestId('context-perspective')
      .getByText('How this level works', { exact: true })
    await explanation.click()
    await expect(
      page.getByTestId('context-perspective').locator('p'),
    ).toBeVisible()
    await explanation.click()
    const toggle = page.getByRole('button', {
      name: 'Hide connected details',
      exact: true,
    })
    await reachable(toggle)
    await expect(toggle).toHaveText('3D view')
    await toggle.click()
    await expect(page.locator('.learn-panel')).toHaveCount(0)
    await page
      .getByRole('button', { name: 'Show connected details', exact: true })
      .click()
    await expect(page.getByTestId('context-perspective')).toBeVisible()
  }
})

test('Learning keeps scale, camera and playback controls reachable in compact orientations', async ({
  page,
}) => {
  test.setTimeout(180000)
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 844, height: 390 },
    { width: 320, height: 568 },
  ]) {
    await page.setViewportSize(viewport)
    for (const query of [
      'view=explore',
      'view=journey',
      'view=lab',
      'view=guide',
      'view=explore&lifecycle=pretrain&level=gpu',
      'view=explore&example=kimi-k3&stage=3&level=pod',
      'view=explore&provider=cloud&level=server&cp_time=12',
    ]) {
      await page.goto(`./?${query}`)
      await expect(page.locator('.learning-world canvas')).toBeVisible()
      await expect
        .poll(
          async () =>
            (await page.locator('.learning-fusion').boundingBox())!.height,
        )
        .toBe(viewport.height)
      await reachable(
        page
          .getByRole('navigation', { name: 'Infrastructure scale' })
          .getByRole('button')
          .first(),
      )
      await reachable(
        page.getByRole('button', { name: 'Top down', exact: true }),
      )
      const deck = page.locator('.learn-command-deck')
      await expect(deck).toBeInViewport({ ratio: 1 })
      const panel = page.locator('.learn-panel')
      if (viewport.width > 700) {
        await expect
          .poll(async () => {
            const readout = (await page
                .locator('.learn-metrics')
                .boundingBox())!,
              camera = (await page.locator('.learn-camera').boundingBox())!
            return readout.y + readout.height <= camera.y
          })
          .toBe(true)
        const heading = page
          .getByTestId('context-perspective')
          .getByRole('heading')
        if (await heading.count())
          await expect(heading).toBeInViewport({ ratio: 1 })
      }
      if (await panel.count()) {
        if (viewport.width <= 700)
          await expect(page.locator('.learn-narration')).toBeHidden()
        await expect
          .poll(async () => {
            const a = (await panel.boundingBox())!,
              b = (await deck.boundingBox())!
            return a.y + a.height <= b.y
          })
          .toBe(true)
      }
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
      ).toBe(false)
    }
  }
})

test('Cloud comparison and service-boundary headings remain readable in the dark reader', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  for (const section of ['lab', 'service']) {
    await learning(page, `provider=cloud&cp_time=12&cp_panel=${section}`)
    const headings = page
      .getByTestId('cloud-provider-study')
      .getByRole('columnheader')
    await expect(headings).toHaveCount(section === 'lab' ? 3 : 2)
    for (const heading of await headings.all()) {
      await heading.scrollIntoViewIfNeeded()
      await reachable(heading)
      const contrast = await heading.evaluate((el) => {
        const rgb = (color: string) => color.match(/[\d.]+/g)!.map(Number)
        const foreground = rgb(getComputedStyle(el).color)
        let background = [255, 255, 255]
        for (let node: Element | null = el; node; node = node.parentElement) {
          const color = rgb(getComputedStyle(node).backgroundColor)
          if ((color[3] ?? 1) === 1) {
            background = color
            break
          }
        }
        const luminance = (color: number[]) =>
          color
            .slice(0, 3)
            .map((v) => v / 255)
            .map((v) =>
              v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4,
            )
            .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0)
        const a = luminance(foreground),
          b = luminance(background)
        return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
      })
      expect(contrast).toBeGreaterThanOrEqual(4.5)
    }
  }
})

test('fallback topology stays inside the hardware workspace and opens component inspection', async ({
  page,
}) => {
  await noWebGL(page)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 844, height: 390 },
    { width: 320, height: 568 },
  ]) {
    await page.setViewportSize(viewport)
    await page.goto('./?view=explore&provider=cloud&level=server&cp_time=12')
    await page
      .getByRole('button', { name: 'Hide connected details', exact: true })
      .click()
    const topology = page.locator('.learning-world .fallback-topology')
    await expect(topology).toBeInViewport({ ratio: 1 })
    await expect
      .poll(async () => {
        const panel = (await topology.boundingBox())!,
          dock = (await page.locator('.learn-command-deck').boundingBox())!
        return panel.y + panel.height <= dock.y
      })
      .toBe(true)
    const controls = topology.getByRole('button')
    for (const control of [controls.first(), controls.last()]) {
      await control.scrollIntoViewIfNeeded()
      await reachable(control)
    }
    const title = (await controls.last().innerText()).trim()
    await controls.last().click()
    await expect(
      page
        .locator('.learn-object-card')
        .getByRole('heading', { name: title, exact: true }),
    ).toBeVisible()
  }
})

test('compact Game workshops can bring a complete decision into view', async ({
  page,
}) => {
  test.setTimeout(120000)
  for (const viewport of [
    { width: 844, height: 390 },
    { width: 320, height: 568 },
  ]) {
    await page.setViewportSize(viewport)
    for (const query of [
      'operation=pretrain&gameLevel=server',
      'operation=inference&gameLevel=gpu',
      'scenario=cloud-provider&gameLevel=server',
    ]) {
      await page.goto(`./?${query}`)
      await page
        .getByRole('button', { name: 'Configure this level', exact: true })
        .click()
      await reachable(page.locator('.campaign-decision button').first())
      await expect(page.locator('.campaign-dock')).toBeInViewport({ ratio: 1 })
      const hide = page.getByRole('button', {
        name: query.includes('scenario')
          ? 'Hide cloud workshop'
          : 'Hide performance workshop',
        exact: true,
      })
      await reachable(hide)
      await expect(hide).toHaveText('3D view')
      await hide.click()
      await expect(page.locator('.campaign-panel')).toHaveCount(0)
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
      ).toBe(false)
    }
  }
})

test.describe('touch exploration', () => {
  test.use({
    hasTouch: true,
    isMobile: true,
    viewport: { width: 390, height: 844 },
  })
  test('a visible 3D-view control releases the world for touch orbiting and restores the lesson', async ({
    page,
    context,
  }) => {
    await learning(page, 'provider=cloud&level=server&cp_time=12')
    const hide = page.getByRole('button', {
      name: 'Hide connected details',
      exact: true,
    })
    await reachable(hide)
    await expect(hide).toHaveText('3D view')
    await hide.tap()
    const canvas = page.locator('.learning-world canvas')
    await expect(canvas).toHaveAttribute('data-world-settled', 'true')
    const before = await canvas.getAttribute('data-camera-pose'),
      session = await context.newCDPSession(page)
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: 140, y: 480, id: 1 }],
    })
    for (let i = 1; i <= 5; i++) {
      await session.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: 140 + i * 12, y: 480 - i * 5, id: 1 }],
      })
    }
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: [],
    })
    await expect
      .poll(() => canvas.getAttribute('data-camera-pose'))
      .not.toBe(before)
    await session.detach()
    await page
      .getByRole('button', { name: 'Show connected details', exact: true })
      .tap()
    await expect(page.getByTestId('cloud-provider-study')).toBeVisible()
    await expect(
      page.getByRole('slider', { name: 'Cloud replay time', exact: true }),
    ).toHaveValue('12')
  })
})
