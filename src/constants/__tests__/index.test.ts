import { afterEach, describe, expect, it, vi } from 'vitest'

const ORIGINAL_ENV = { ...process.env }

async function importConstantsWithEnv(env: Record<string, string | undefined>) {
	vi.resetModules()

	delete process.env.API_KEY
	delete process.env.MARKETS_SERVER_URL
	delete process.env.PRO_API_URL

	for (const [key, value] of Object.entries(env)) {
		if (value == null) {
			delete process.env[key]
		} else {
			process.env[key] = value
		}
	}

	return import('../index')
}

afterEach(() => {
	vi.resetModules()
	process.env = { ...ORIGINAL_ENV }
})

describe('PRO_API_BASE_URL', () => {
	it('uses the default pro API URL outside production', async () => {
		const constants = await importConstantsWithEnv({
			API_KEY: 'secret-api-key',
			NODE_ENV: 'development',
			PRO_API_URL: 'https://pro-api.example.com'
		})

		expect(constants.PRO_API_BASE_URL).toBe('https://pro-api.llama.fi')
		expect(constants.SERVER_URL).toBe('https://pro-api.llama.fi/secret-api-key/api')
	})

	it('uses the configured pro API URL in production', async () => {
		const constants = await importConstantsWithEnv({
			API_KEY: 'secret-api-key',
			NODE_ENV: 'production',
			PRO_API_URL: 'https://pro-api.example.com'
		})

		expect(constants.PRO_API_BASE_URL).toBe('https://pro-api.example.com')
		expect(constants.SERVER_URL).toBe('https://pro-api.example.com/secret-api-key/api')
		expect(constants.DATASETS_SERVER_URL).toBe('https://pro-api.example.com/secret-api-key/datasets')
	})
})

describe('MARKETS_SERVER_URL', () => {
	it('does not derive from the pro API key', async () => {
		const constants = await importConstantsWithEnv({ API_KEY: 'secret-api-key' })

		expect(constants.MARKETS_SERVER_URL).toBeUndefined()
	})

	it('uses the explicit markets server URL when provided', async () => {
		const constants = await importConstantsWithEnv({
			API_KEY: 'secret-api-key',
			MARKETS_SERVER_URL: 'https://markets.example.com'
		})

		expect(constants.MARKETS_SERVER_URL).toBe('https://markets.example.com')
	})
})
