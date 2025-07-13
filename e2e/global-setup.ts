import { chromium, FullConfig } from '@playwright/test'

async function globalSetup(config: FullConfig) {
	const browser = await chromium.launch()
	const page = await browser.newPage()

	try {
		await page.goto(config.projects[0].use.baseURL)
		await page.waitForLoadState('domcontentloaded')
	} catch (error) {
		console.warn('Failed to pre-warm application:', error)
	}

	await browser.close()
}

export default globalSetup
