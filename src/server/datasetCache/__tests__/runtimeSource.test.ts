import { afterEach, describe, expect, it, vi } from 'vitest'

describe('dataset cache runtime source', () => {
	afterEach(() => {
		vi.resetModules()
		vi.unstubAllEnvs()
	})

	it('uses the network adapter when the dataset cache is disabled', async () => {
		vi.stubEnv('NODE_ENV', 'production')
		vi.stubEnv('DATASET_CACHE_DISABLE', '1')
		const { readThroughDatasetCache } = await import('../runtime/source')
		const readCache = vi.fn(async () => 'cache')
		const readNetwork = vi.fn(async () => 'network')

		await expect(readThroughDatasetCache({ domain: 'yields', readCache, readNetwork })).resolves.toBe('network')
		expect(readCache).not.toHaveBeenCalled()
	})

	it('falls back to the network adapter for failed manifest domains', async () => {
		vi.stubEnv('NODE_ENV', 'production')
		const { DatasetDomainUnavailableError } = await import('../core')
		const { readThroughDatasetCache } = await import('../runtime/source')
		const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
		const readCache = vi.fn(async () => {
			throw new DatasetDomainUnavailableError('yields', 'upstream failed')
		})
		const readNetwork = vi.fn(async () => 'network')

		await expect(readThroughDatasetCache({ domain: 'yields', readCache, readNetwork })).resolves.toBe('network')
		expect(consoleWarnSpy).toHaveBeenCalledWith(
			'[datasetCache] yields domain unavailable; falling back to network: upstream failed'
		)
		consoleWarnSpy.mockRestore()
	})

	it('does not hide integrity errors from ready domains', async () => {
		vi.stubEnv('NODE_ENV', 'production')
		const { readThroughDatasetCache } = await import('../runtime/source')
		const readCache = vi.fn(async () => {
			throw new Error('missing rows.json')
		})
		const readNetwork = vi.fn(async () => 'network')

		await expect(readThroughDatasetCache({ domain: 'yields', readCache, readNetwork })).rejects.toThrow(
			'missing rows.json'
		)
		expect(readNetwork).not.toHaveBeenCalled()
	})
})
