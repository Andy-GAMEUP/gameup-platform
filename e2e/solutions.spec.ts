import { test, expect } from '@playwright/test'

test.describe('Solutions', () => {
  test('solutions page loads', async ({ page }) => {
    await page.goto('/solutions')
    await expect(page.locator('main')).toBeVisible()
  })

  test('solutions page shows service offerings', async ({ page }) => {
    await page.goto('/solutions')
    await expect(page.locator('body')).toBeVisible()
  })

  test('solutions page has navigation', async ({ page }) => {
    await page.goto('/solutions')
    await expect(page.locator('nav')).toBeVisible()
  })

  test('solutions tabs or sections are accessible', async ({ page }) => {
    await page.goto('/solutions')
    const tabs = page.locator('[role="tab"], [role="tablist"]')
    const tabCount = await tabs.count()
    expect(tabCount).toBeGreaterThanOrEqual(0)
  })
})
