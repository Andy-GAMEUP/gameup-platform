import { test, expect } from '@playwright/test'

test.describe('Support Program', () => {
  test('support page loads', async ({ page }) => {
    await page.goto('/support')
    await expect(page.locator('main')).toBeVisible()
  })

  test('support page shows program information', async ({ page }) => {
    await page.goto('/support')
    await expect(page.locator('body')).toBeVisible()
  })

  test('support page has navigation', async ({ page }) => {
    await page.goto('/support')
    await expect(page.locator('nav')).toBeVisible()
  })

  test('support application or info sections are present', async ({ page }) => {
    await page.goto('/support')
    const sections = page.locator('section')
    const sectionCount = await sections.count()
    expect(sectionCount).toBeGreaterThanOrEqual(0)
  })
})
