import { test, expect } from '@playwright/test'

test.describe('Search - Core Functionality Tests', () => {
	test('search input exists', async ({ page }) => {
		await page.goto('/', { timeout: 90000 })

		const viewportSize = page.viewportSize()
		const isMobile = viewportSize && viewportSize.width < 1024

		if (isMobile) {
			// Mobile: Look for the mobile search button
			const mobileSearchButton = page
				.locator('nav button')
				.filter({ hasText: /Search/ })
				.first()

			await expect(mobileSearchButton).toBeVisible({ timeout: 10000 })

			await mobileSearchButton.click()
			await page.waitForTimeout(500)

			const searchInputs = page.locator('input[placeholder="Search..."]')
			await expect(searchInputs.first()).toBeVisible({ timeout: 10000 })
		} else {
			// Desktop: Search input should be directly visible
			const searchInput = page.locator('[data-testid="search-input"]')
			await expect(searchInput).toBeVisible({ timeout: 30000 })
		}
	})
})
