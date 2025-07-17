import { defineConfig, devices } from '@playwright/test'
import dotenv from 'dotenv'

dotenv.config()

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
	testDir: './e2e',
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: process.env.CI ? 'github' : 'html',
	outputDir: './e2e/test-results',
	use: {
		baseURL: process.env.NEXT_PUBLIC_BASE_URL,
		trace: 'on-first-retry',
		screenshot: 'only-on-failure',
		video: 'retain-on-failure',
		actionTimeout: 10 * 1000,
		navigationTimeout: 30 * 1000
	},

	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] }
		},

		{
			name: 'firefox',
			use: { ...devices['Desktop Firefox'] }
		},

		{
			name: 'webkit',
			use: { ...devices['Desktop Safari'] }
		},

		/* mobile viewports. */
		{
			name: 'Mobile Chrome',
			use: { ...devices['Pixel 5'] }
		},
		{
			name: 'Mobile Safari',
			use: { ...devices['iPhone 12'] }
		},

		/* Test against branded browsers. */
		{
			name: 'Google Chrome',
			use: { ...devices['Desktop Chrome'], channel: 'chrome' }
		}
	],

	webServer: {
		command: 'yarn dev',
		url: process.env.NEXT_PUBLIC_BASE_URL,
		reuseExistingServer: !process.env.CI,
		timeout: 120 * 1000
	},

	/* Global setup and teardown */
	globalSetup: './e2e/global-setup.ts',

	/* Test timeout */
	timeout: 120000, // Increase timeout to 2 minutes for slow loading

	/* Expect timeout */
	expect: {
		timeout: 5 * 1000
	}
})
