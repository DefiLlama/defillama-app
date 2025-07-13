import { Page, expect } from '@playwright/test'
import { SELECTORS } from '../selectors'
import { UIInteractions } from '../ui-interactions'

export class HomePage {
	private ui: UIInteractions

	constructor(private page: Page) {
		this.ui = new UIInteractions(page)
	}

	// Navigation methods
	async visit() {
		await this.ui.navigateToHomepage()
		await this.dismissOnboardingIfPresent()
	}

	async dismissOnboardingIfPresent() {
		await this.ui.dismissOnboardingIfPresent()
	}

	// Element getters
	get totalTVLElement() {
		return this.page.locator(SELECTORS.HOMEPAGE.TOTAL_TVL)
	}

	get protocolsTable() {
		return this.page.locator(SELECTORS.HOMEPAGE.PROTOCOLS_TABLE)
	}

	get protocolRows() {
		return this.page.locator(SELECTORS.HOMEPAGE.PROTOCOL_ROW)
	}

	get chartContainer() {
		return this.page.locator(SELECTORS.HOMEPAGE.CHART_CONTAINER)
	}

	get searchInput() {
		return this.page.locator(SELECTORS.SEARCH.INPUT)
	}

	get chainLinks() {
		return this.page.locator(SELECTORS.CHAIN.LINK)
	}

	// Action methods
	async getTotalTVL() {
		await expect(this.totalTVLElement).toBeVisible()
		const text = await this.totalTVLElement.textContent()
		return text?.trim() || ''
	}

	async selectChain(chainName: string) {
		await this.chainLinks.filter({ hasText: chainName }).first().click()
		await this.ui.waitForPageToLoad()
	}

	async searchForProtocol(protocolName: string) {
		await this.searchInput.click()
		await this.searchInput.fill(protocolName)

		// Wait for search results
		await this.page.waitForSelector(SELECTORS.SEARCH.RESULTS, { timeout: 10000 })

		// Click on first result
		await this.page.locator(SELECTORS.SEARCH.RESULT_ITEM).first().click()
	}

	async getProtocolCount() {
		await expect(this.protocolsTable).toBeVisible()
		const rows = await this.protocolRows.count()
		return rows
	}

	async clickProtocolByName(protocolName: string) {
		await this.protocolRows.filter({ hasText: protocolName }).first().click()
	}

	// Assertion methods
	async expectPageToLoad() {
		await expect(this.page).toHaveTitle(/DefiLlama - DeFi Dashboard/)
		await expect(this.totalTVLElement).toBeVisible({ timeout: 30000 })
		await expect(this.protocolsTable).toBeVisible({ timeout: 30000 })
	}

	async expectTVLToBeDisplayed() {
		await expect(this.totalTVLElement).toBeVisible()
		const tvlText = await this.totalTVLElement.textContent()
		expect(tvlText).toMatch(/\$[\d,]+\.?\d*[KMB]?/i)
	}

	async expectProtocolsTableToBeVisible() {
		await expect(this.protocolsTable).toBeVisible()
		await expect(this.protocolRows.first()).toBeVisible()
	}

	async expectChartToBeVisible() {
		await expect(this.chartContainer).toBeVisible({ timeout: 15000 })
	}

	async expectSearchToBeWorking() {
		await expect(this.searchInput).toBeVisible()
		await expect(this.searchInput).toBeEnabled()
	}

	async expectChainFilterToBeVisible() {
		await expect(this.chainLinks.first()).toBeVisible()
	}

	async expectProtocolToBeInTable(protocolName: string) {
		await expect(this.protocolRows.filter({ hasText: protocolName })).toBeVisible()
	}

	async expectMinimumProtocolCount(minCount: number) {
		const actualCount = await this.getProtocolCount()
		expect(actualCount).toBeGreaterThanOrEqual(minCount)
	}
}
