import { Page, expect } from '@playwright/test'
import { SELECTORS } from '../selectors'
import { UIInteractions } from '../ui-interactions'

export class ProtocolDetailPage {
	private ui: UIInteractions

	constructor(private page: Page) {
		this.ui = new UIInteractions(page)
	}

	// Navigation methods
	async visit(protocolName: string) {
		await this.ui.navigateToProtocol(protocolName)
	}

	// Element getters
	get protocolTitle() {
		return this.page.locator(SELECTORS.PROTOCOL_DETAIL.TITLE)
	}

	get protocolTVL() {
		return this.page.locator(SELECTORS.PROTOCOL_DETAIL.TVL_VALUE)
	}

	get protocolChart() {
		return this.page.locator(SELECTORS.PROTOCOL_DETAIL.CHART)
	}

	get protocolDescription() {
		return this.page.locator(SELECTORS.PROTOCOL_DETAIL.DESCRIPTION)
	}

	get protocolWebsite() {
		return this.page.locator(SELECTORS.PROTOCOL_DETAIL.WEBSITE_LINK)
	}

	get protocolAudit() {
		return this.page.locator(SELECTORS.PROTOCOL_DETAIL.AUDIT_LINK)
	}

	get protocolCategory() {
		return this.page.locator(SELECTORS.PROTOCOL_DETAIL.CATEGORY)
	}

	get protocolChains() {
		return this.page.locator(SELECTORS.PROTOCOL_DETAIL.CHAINS)
	}

	get protocolHeader() {
		return this.page.locator(SELECTORS.PROTOCOL_DETAIL.HEADER)
	}

	// Action methods
	async getProtocolName() {
		await expect(this.protocolTitle).toBeVisible()
		const text = await this.protocolTitle.textContent()
		return text?.trim() || ''
	}

	async getProtocolTVL() {
		await expect(this.protocolTVL).toBeVisible()
		const text = await this.protocolTVL.textContent()
		return text?.trim() || ''
	}

	async getProtocolCategory() {
		await expect(this.protocolCategory).toBeVisible()
		const text = await this.protocolCategory.textContent()
		return text?.trim() || ''
	}

	async clickWebsiteLink() {
		await expect(this.protocolWebsite).toBeVisible()
		await this.protocolWebsite.click()
	}

	async clickAuditLink() {
		await expect(this.protocolAudit).toBeVisible()
		await this.protocolAudit.click()
	}

	async waitForChartToLoad() {
		await expect(this.protocolChart).toBeVisible({ timeout: 15000 })
	}

	// Assertion methods
	async expectPageToLoad(expectedProtocolName?: string) {
		await expect(this.protocolHeader).toBeVisible({ timeout: 30000 })
		await expect(this.protocolTitle).toBeVisible({ timeout: 30000 })
		await expect(this.protocolTVL).toBeVisible({ timeout: 30000 })

		if (expectedProtocolName) {
			const actualName = await this.getProtocolName()
			expect(actualName.toLowerCase()).toContain(expectedProtocolName.toLowerCase())
		}
	}

	async expectTVLToBeDisplayed() {
		await expect(this.protocolTVL).toBeVisible()
		const tvlText = await this.protocolTVL.textContent()
		expect(tvlText).toMatch(/\$[\d,]+\.?\d*[KMB]?/i)
	}

	async expectChartToBeVisible() {
		await expect(this.protocolChart).toBeVisible({ timeout: 15000 })
	}

	async expectProtocolInfoToBeVisible() {
		await expect(this.protocolTitle).toBeVisible()
		await expect(this.protocolTVL).toBeVisible()
		await expect(this.protocolCategory).toBeVisible()
	}

	async expectWebsiteLinkToBeVisible() {
		await expect(this.protocolWebsite).toBeVisible()
	}

	async expectAuditLinkToBeVisible() {
		await expect(this.protocolAudit).toBeVisible()
	}

	async expectChainsToBeVisible() {
		await expect(this.protocolChains).toBeVisible()
	}

	async expectDescriptionToBeVisible() {
		await expect(this.protocolDescription).toBeVisible()
	}

	async expectProtocolNameToBe(expectedName: string) {
		const actualName = await this.getProtocolName()
		expect(actualName.toLowerCase()).toContain(expectedName.toLowerCase())
	}

	async expectCategoryToBe(expectedCategory: string) {
		const actualCategory = await this.getProtocolCategory()
		expect(actualCategory.toLowerCase()).toContain(expectedCategory.toLowerCase())
	}

	async expectTVLToBeNumeric() {
		const tvlText = await this.getProtocolTVL()
		expect(tvlText).toMatch(/\$[\d,]+\.?\d*/i)
	}

	async expectHistoricalChartToBeVisible() {
		await this.waitForChartToLoad()
		await expect(this.protocolChart).toBeVisible()
	}
}
