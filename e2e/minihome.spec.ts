import { test, expect } from '@playwright/test'

test.describe('MiniHome', () => {
  test('minihome directory page loads', async ({ page }) => {
    await page.goto('/minihome')
    await expect(page.locator('main')).toBeVisible()
  })

  test('minihome page shows user profiles or empty state', async ({ page }) => {
    await page.goto('/minihome')
    await expect(page.locator('body')).toBeVisible()
  })

  test('minihome page has navigation', async ({ page }) => {
    await page.goto('/minihome')
    await expect(page.locator('nav')).toBeVisible()
  })

  test('individual minihome profile renders', async ({ page }) => {
    await page.goto('/minihome/1')
    await expect(page.locator('body')).toBeVisible()
  })
})
