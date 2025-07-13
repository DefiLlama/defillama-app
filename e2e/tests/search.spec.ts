import { test, expect } from '@playwright/test'

test.describe('Search - Ultra Simple MVP Tests', () => {
	test('search input exists', async ({ page }) => {
		await page.goto('/', { timeout: 90000 })

		const searchInput = page.locator('[data-testid="search-input"]')
		await expect(searchInput).toBeVisible({ timeout: 30000 })
	})
})
