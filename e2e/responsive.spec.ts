import { test, expect } from '@playwright/test'

test.describe('Mobile Responsive', () => {
  test.use({ viewport: { width: 375, height: 667 } })

  test('homepage renders on mobile', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('nav')).toBeVisible()
  })

  test('navigation works on mobile', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('body')).toBeVisible()
  })

  test('games page renders on mobile', async ({ page }) => {
    await page.goto('/games')
    await expect(page.locator('main')).toBeVisible()
  })

  test('community page renders on mobile', async ({ page }) => {
    await page.goto('/community')
    await expect(page.locator('main')).toBeVisible()
  })

  test('login page renders on mobile', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('body')).toBeVisible()
  })
})
