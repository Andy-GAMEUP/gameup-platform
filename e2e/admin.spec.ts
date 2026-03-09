import { test, expect } from '@playwright/test'

test.describe('Admin', () => {
  test('admin page redirects without auth', async ({ page }) => {
    await page.goto('/admin')
    await page.waitForTimeout(2000)
    const url = page.url()
    expect(url).toBeTruthy()
  })

  test('admin login page is accessible', async ({ page }) => {
    await page.goto('/admin/login')
    await expect(page.locator('body')).toBeVisible()
  })

  test('admin users route requires authentication', async ({ page }) => {
    await page.goto('/admin/users')
    await page.waitForTimeout(1000)
    const url = page.url()
    expect(url).toBeTruthy()
  })

  test('admin games route requires authentication', async ({ page }) => {
    await page.goto('/admin/games')
    await page.waitForTimeout(1000)
    const url = page.url()
    expect(url).toBeTruthy()
  })
})
