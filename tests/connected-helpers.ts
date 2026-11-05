import { expect } from '@playwright/test'
import type { Page } from '@playwright/test'
export const canvas = '.learning-world canvas'
export const metrics = (page: Page) =>
  page.getByRole('group', { name: 'Connected story metrics' })
export async function open(page: Page, query: string) {
  await page.goto(`/?view=explore&learn=fusion&${query}`)
  await expect(page.locator(canvas)).toHaveAttribute(
    'data-world-kind',
    'infrastructure',
  )
  await expect(page.getByTestId('context-perspective')).toBeVisible()
}
export async function level(page: Page, id: string) {
  const names = {
    fleet: '1 Fleet',
    pod: '2 Pod',
    rack: '3 Server',
    gpu: '4 GPU',
  }
  await page
    .getByRole('navigation', { name: 'Infrastructure scale' })
    .getByRole('button', {
      name: new RegExp('^' + names[id as keyof typeof names] + ' '),
    })
    .click()
  await expect(page.locator(canvas)).toHaveAttribute('data-motion-layer', id)
}
export async function step(page: Page, index: number) {
  await page
    .getByRole('button', { name: new RegExp(`^Context step ${index + 1}:`) })
    .click()
  await expect(page.locator(canvas)).toHaveAttribute(
    'data-context-stage',
    String(index),
  )
}
export async function browse(page: Page) {
  await page
    .getByRole('button', { name: 'Browse stories at this level', exact: true })
    .click()
  await expect(page.getByTestId('infrastructure-connections')).toBeVisible()
}
export async function noWebGL(page: Page) {
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
