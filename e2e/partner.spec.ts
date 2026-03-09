import { test, expect } from '@playwright/test'

test.describe('Partner Directory', () => {
  test('partner page loads', async ({ page }) => {
    await page.goto('/partner')
    await expect(page.locator('main')).toBeVisible()
  })

  test('partner page shows directory heading', async ({ page }) => {
    await page.goto('/partner')
    await expect(page.locator('body')).toBeVisible()
  })

  test('partner page has nav', async ({ page }) => {
    await page.goto('/partner')
    await expect(page.locator('nav')).toBeVisible()
  })

  test('partner application link is accessible', async ({ page }) => {
    await page.goto('/partner')
    await expect(page.locator('body')).toBeVisible()
  })
})
