import { afterEach, describe, expect, it, vi } from 'vitest'

const ORIGINAL_ENV = { ...process.env }

async function importConstantsWithEnv(env: Record<string, string | undefined>) {
	vi.resetModules()

	delete process.env.API_KEY
	delete process.env.MARKETS_SERVER_URL

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
