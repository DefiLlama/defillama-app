import { afterEach, describe, expect, it, vi } from 'vitest'
import { DIRECT_URL_ENV_NAMES } from '~/utils/directApi'

const ORIGINAL_ENV = { ...process.env }

async function importConstantsWithEnv(env: Record<string, string | undefined>) {
	vi.resetModules()

	delete process.env.API_KEY
	delete process.env.PRO_API_URL
	for (const key of DIRECT_URL_ENV_NAMES) {
		delete process.env[key]
	}

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

describe('server URL constants', () => {
	it('uses public upstreams without an API key or direct URL overrides', async () => {
		const constants = await importConstantsWithEnv({})

		expect(constants.SERVER_URL).toBe('https://api.llama.fi')
		expect(constants.V2_SERVER_URL).toBe('https://api.llama.fi/v2')
		expect(constants.DATASETS_SERVER_URL).toBe('https://defillama-datasets.llama.fi')
		expect(constants.BRIDGES_SERVER_URL).toBe('https://bridges.llama.fi')
		expect(constants.COINS_SERVER_URL).toBe('https://coins.llama.fi')
		expect(constants.EQUITIES_SERVER_URL).toBe('https://api.llama.fi/equities/v1')
		expect(constants.ETF_SERVER_URL).toBe('https://etfs.llama.fi')
		expect(constants.FDV_SERVER_URL).toBe('https://fdv-server.llama.fi')
		expect(constants.RWA_SERVER_URL).toBe('https://api.llama.fi/rwa')
		expect(constants.RWA_PERPS_SERVER_URL).toBe('https://api.llama.fi/rwa-perps')
		expect(constants.STABLECOINS_SERVER_URL).toBe('https://stablecoins.llama.fi')
		expect(constants.TRADFI_API).toBe('https://api.llama.fi/dat')
		expect(constants.YIELDS_SERVER_URL).toBe('https://yields.llama.fi')
		expect(constants.LIQUIDATIONS_SERVER_URL_V2).toBe('https://api.llama.fi/liquidations')
		expect(constants.RISK_SERVER_URL).toBe('https://risks.llama.fi')
	})

	it('uses direct URL overrides before pro API fallbacks', async () => {
		const constants = await importConstantsWithEnv({
			API_KEY: 'secret-api-key',
			BRIDGES_SERVER_URL: 'https://bridges.example.com/',
			COINS_SERVER_URL: 'https://coins.example.com/',
			DATASETS_SERVER_URL: 'https://datasets.example.com/',
			EQUITIES_SERVER_URL: 'https://equities.example.com/v1/',
			ETF_SERVER_URL: 'https://etfs.example.com/',
			FDV_SERVER_URL: 'https://fdv.example.com/',
			LIQUIDATIONS_SERVER_URL_V2: 'https://liquidations.example.com/',
			MARKETS_SERVER_URL: 'https://markets.example.com/',
			RISK_SERVER_URL: 'https://risks.example.com/',
			RWA_PERPS_SERVER_URL: 'https://rwa-perps.example.com/',
			RWA_SERVER_URL: 'https://rwa.example.com/',
			SERVER_URL: 'https://core.example.com/api/',
			STABLECOINS_SERVER_URL: 'https://stablecoins.example.com/',
			TRADFI_API: 'https://tradfi.example.com/',
			YIELDS_SERVER_URL: 'https://yields.example.com/'
		})

		expect(constants.SERVER_URL).toBe('https://core.example.com/api')
		expect(constants.V2_SERVER_URL).toBe('https://core.example.com/api/v2')
		expect(constants.DATASETS_SERVER_URL).toBe('https://datasets.example.com')
		expect(constants.BRIDGES_SERVER_URL).toBe('https://bridges.example.com')
		expect(constants.COINS_SERVER_URL).toBe('https://coins.example.com')
		expect(constants.EQUITIES_SERVER_URL).toBe('https://equities.example.com/v1')
		expect(constants.ETF_SERVER_URL).toBe('https://etfs.example.com')
		expect(constants.FDV_SERVER_URL).toBe('https://fdv.example.com')
		expect(constants.RWA_SERVER_URL).toBe('https://rwa.example.com')
		expect(constants.RWA_PERPS_SERVER_URL).toBe('https://rwa-perps.example.com')
		expect(constants.STABLECOINS_SERVER_URL).toBe('https://stablecoins.example.com')
		expect(constants.TRADFI_API).toBe('https://tradfi.example.com')
		expect(constants.YIELDS_SERVER_URL).toBe('https://yields.example.com')
		expect(constants.LIQUIDATIONS_SERVER_URL_V2).toBe('https://liquidations.example.com')
		expect(constants.RISK_SERVER_URL).toBe('https://risks.example.com')
		expect(constants.MARKETS_SERVER_URL).toBe('https://markets.example.com')
	})

	it('uses an explicit V2 server URL override when provided', async () => {
		const constants = await importConstantsWithEnv({
			API_KEY: 'secret-api-key',
			SERVER_URL: 'https://core.example.com/api',
			V2_SERVER_URL: 'https://core-v2.example.com'
		})

		expect(constants.SERVER_URL).toBe('https://core.example.com/api')
		expect(constants.V2_SERVER_URL).toBe('https://core-v2.example.com')
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
