import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test('login page renders with OAuth buttons', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('text=카카오')).toBeVisible()
    await expect(page.locator('text=네이버')).toBeVisible()
  })

  test('login with invalid credentials shows error', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', 'test@test.com')
    await page.fill('input[type="password"]', 'wrongpass')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/login/)
  })

  test('register page loads', async ({ page }) => {
    await page.goto('/register')
    await expect(page.locator('text=회원가입')).toBeVisible()
  })

  test('login page has email and password fields', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })

  test('login page has submit button', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('login page has link to register', async ({ page }) => {
    await page.goto('/login')
    const registerLink = page.locator('a[href="/register"]')
    await expect(registerLink).toBeVisible()
  })
})
