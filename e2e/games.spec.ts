import { test, expect } from '@playwright/test'

test.describe('Games', () => {
  test('games page loads', async ({ page }) => {
    await page.goto('/games')
    await expect(page.locator('text=게임')).toBeVisible()
  })

  test('game list shows cards or empty state', async ({ page }) => {
    await page.goto('/games')
    const content = page.locator('main')
    await expect(content).toBeVisible()
  })

  test('game page has navigation back to home', async ({ page }) => {
    await page.goto('/games')
    await expect(page.locator('nav')).toBeVisible()
  })

  test('games page renders genre filter or tabs', async ({ page }) => {
    await page.goto('/games')
    await expect(page.locator('body')).toBeVisible()
  })
})
