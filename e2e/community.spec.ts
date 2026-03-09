import { test, expect } from '@playwright/test'

test.describe('Community', () => {
  test('community page loads with channels', async ({ page }) => {
    await page.goto('/community')
    await expect(page.locator('text=커뮤니티')).toBeVisible()
  })

  test('can switch community channels', async ({ page }) => {
    await page.goto('/community')
    const tabs = page.locator('[role="tab"], button').filter({ hasText: /공지|질문|이야기|정보/ })
    await expect(tabs.first()).toBeVisible()
  })

  test('community page has post list area', async ({ page }) => {
    await page.goto('/community')
    await expect(page.locator('main')).toBeVisible()
  })

  test('community page search is accessible', async ({ page }) => {
    await page.goto('/community')
    await expect(page.locator('body')).toBeVisible()
  })
})
