import { test, expect } from '@playwright/test'

test.describe('Homepage - Ultra Simple MVP Tests', () => {
	test('page loads successfully', async ({ page }) => {
		await page.goto('/', { timeout: 90000 })

		await expect(page).toHaveTitle(/DefiLlama/i)
	})

	test('TVL data is displayed', async ({ page }) => {
		await page.goto('/', { timeout: 90000 })

		const tvlElement = page.locator('[data-testid="total-tvl"]')
		await expect(tvlElement).toBeVisible({ timeout: 30000 })
	})
})
