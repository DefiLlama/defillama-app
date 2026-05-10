import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('metadata upstream base selection', () => {
	beforeEach(() => {
		vi.resetModules()
		vi.unstubAllEnvs()
	})

	it('uses public upstreams without an API key', async () => {
		vi.stubEnv('API_KEY', '')
		const { getMetadataUpstreamBase } = await import('../upstream')

		expect(getMetadataUpstreamBase('core')).toBe('https://api.llama.fi')
		expect(getMetadataUpstreamBase('rwa')).toBe('https://api.llama.fi/rwa')
		expect(getMetadataUpstreamBase('rwa-perps')).toBe('https://api.llama.fi/rwa-perps')
		expect(getMetadataUpstreamBase('bridges')).toBe('https://bridges.llama.fi')
		expect(getMetadataUpstreamBase('datasets')).toBe('https://defillama-datasets.llama.fi')
	})

	it('uses pro upstreams with an API key', async () => {
		vi.stubEnv('API_KEY', 'secret-key')
		const { getMetadataUpstreamBase } = await import('../upstream')

		expect(getMetadataUpstreamBase('core')).toBe('https://pro-api.llama.fi/secret-key/api')
		expect(getMetadataUpstreamBase('rwa')).toBe('https://pro-api.llama.fi/secret-key/rwa')
		expect(getMetadataUpstreamBase('rwa-perps')).toBe('https://pro-api.llama.fi/secret-key/rwa-perps')
		expect(getMetadataUpstreamBase('bridges')).toBe('https://pro-api.llama.fi/secret-key/bridges')
		expect(getMetadataUpstreamBase('datasets')).toBe('https://pro-api.llama.fi/secret-key/datasets')
	})
})
