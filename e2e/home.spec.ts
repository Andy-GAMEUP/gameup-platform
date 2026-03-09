import { test, expect } from '@playwright/test'

test.describe('Homepage', () => {
  test('should load homepage', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/GAMEUP/)
    await expect(page.locator('nav')).toBeVisible()
  })

  test('should navigate to games', async ({ page }) => {
    await page.goto('/')
    await page.click('a[href="/games"]')
    await expect(page).toHaveURL('/games')
  })

  test('should navigate to community', async ({ page }) => {
    await page.goto('/')
    await page.click('a[href="/community"]')
    await expect(page).toHaveURL('/community')
  })

  test('should show hero section', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('main')).toBeVisible()
  })

  test('should show footer', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('footer')).toBeVisible()
  })
})
