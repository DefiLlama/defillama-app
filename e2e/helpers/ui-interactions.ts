import { Page, expect } from '@playwright/test'

export class UIInteractions {
	constructor(private page: Page) {}

	/**
	 * Navigate to a specific page and wait for it to load
	 */
	async navigateToPage(path: string) {
		await this.page.goto(path)
		await this.page.waitForLoadState('domcontentloaded')
	}

	/**
	 * Navigate to the homepage and wait for TVL to be visible
	 */
	async navigateToHomepage() {
		await this.page.goto('/')
		await this.page.waitForLoadState('domcontentloaded')
		// Wait for main content to load
		await expect(this.page.locator('[data-testid="total-tvl"]')).toBeVisible({ timeout: 30000 })
	}

	/**
	 * Navigate to a specific protocol page
	 */
	async navigateToProtocol(protocolName: string) {
		await this.page.goto(`/protocol/${protocolName}`)
		await this.page.waitForLoadState('domcontentloaded')
	}

	/**
	 * Navigate to a specific chain page
	 */
	async navigateToChain(chainName: string) {
		await this.page.goto(`/chain/${chainName}`)
		await this.page.waitForLoadState('domcontentloaded')
	}

	/**
	 * Use the search functionality to find a protocol
	 */
	async searchForProtocol(protocolName: string) {
		// Click on search input
		await this.page.locator('[data-testid="search-input"]').click()

		// Type the protocol name
		await this.page.locator('[data-testid="search-input"]').fill(protocolName)

		// Wait for search results to appear
		await this.page.waitForSelector('[data-testid="search-results"]', { timeout: 10000 })

		// Click on the first result
		await this.page.locator('[data-testid="search-result-item"]').first().click()
	}

	/**
	 * Select a chain from the chain dropdown/filter
	 */
	async selectChain(chainName: string) {
		// Look for chain links and click on the specified chain
		await this.page.locator('[data-testid="chain-link"]').filter({ hasText: chainName }).click()
		await this.page.waitForLoadState('domcontentloaded')
	}

	/**
	 * Wait for charts to load
	 */
	async waitForChartsToLoad() {
		await this.page.waitForSelector('[data-testid="chart-container"]', { timeout: 15000 })
	}

	/**
	 * Wait for table data to load
	 */
	async waitForTableToLoad() {
		await this.page.waitForSelector('[data-testid="protocols-table"]', { timeout: 15000 })
	}

	/**
	 * Check if TVL value is displayed and formatted correctly
	 */
	async expectTVLToBeVisible() {
		const tvlElement = this.page.locator('[data-testid="total-tvl"]')
		await expect(tvlElement).toBeVisible()

		// Check if TVL contains a dollar sign and is formatted as currency
		const tvlText = await tvlElement.textContent()
		expect(tvlText).toMatch(/\$[\d,]+\.?\d*/i)
	}

	/**
	 * Check if protocol table is visible and contains data
	 */
	async expectProtocolTableToBeVisible() {
		await expect(this.page.locator('[data-testid="protocols-table"]')).toBeVisible()

		// Check if table has rows
		const rows = this.page.locator('[data-testid="protocol-row"]')
		await expect(rows.first()).toBeVisible()
	}

	/**
	 * Check if search functionality is working
	 */
	async expectSearchToBeWorking() {
		await expect(this.page.locator('[data-testid="search-input"]')).toBeVisible()
		await expect(this.page.locator('[data-testid="search-input"]')).toBeEnabled()
	}

	/**
	 * Dismiss any onboarding/tour modals if they appear
	 */
	async dismissOnboardingIfPresent() {
		// Look for common onboarding modal selectors
		const onboardingModal = this.page.locator('[data-testid="onboarding-modal"]')
		const closeButton = this.page.locator('[data-testid="close-onboarding"]')

		try {
			if (await onboardingModal.isVisible({ timeout: 2000 })) {
				if (await closeButton.isVisible()) {
					await closeButton.click()
				} else {
					// Try pressing Escape key
					await this.page.keyboard.press('Escape')
				}
			}
		} catch (error) {
			// Onboarding modal not present, continue
		}
	}

	/**
	 * Check if a specific metric is visible on the page
	 */
	async expectMetricToBeVisible(metricTestId: string) {
		await expect(this.page.locator(`[data-testid="${metricTestId}"]`)).toBeVisible()
	}

	/**
	 * Wait for page to be fully loaded with all critical elements
	 */
	async waitForPageToLoad() {
		await this.page.waitForLoadState('domcontentloaded')
		await this.page.waitForLoadState('networkidle')
	}
}
