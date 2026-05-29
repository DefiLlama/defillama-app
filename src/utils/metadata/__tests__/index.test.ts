import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CoreMetadataPayload } from '../artifactContract'

const { bootArtifactsMock, fetchCoreMetadataMock, recordDomainEventMock, runOutsideRouteTelemetryMock } = vi.hoisted(
	() => ({
		bootArtifactsMock: vi.fn(),
		fetchCoreMetadataMock: vi.fn(),
		recordDomainEventMock: vi.fn(),
		runOutsideRouteTelemetryMock: vi.fn((run: () => unknown) => run())
	})
)

vi.mock('../fetch', () => ({
	fetchCoreMetadata: fetchCoreMetadataMock
}))

vi.mock('~/utils/telemetry', () => ({
	recordDomainEvent: recordDomainEventMock,
	runOutsideRouteTelemetry: runOutsideRouteTelemetryMock
}))

vi.mock('../artifacts', () => ({
	loadMetadataArtifactsForBoot: bootArtifactsMock
}))

const defaultTokenListEntry = {
	symbol: 'AAVE',
	current_price: null,
	price_change_24h: null,
	price_change_percentage_24h: null,
	ath: null,
	ath_date: null,
	atl: null,
	atl_date: null,
	market_cap: null,
	fully_diluted_valuation: null,
	total_volume: null,
	total_supply: null,
	circulating_supply: null,
	max_supply: null
}

function createMetadataPayload(overrides: Partial<CoreMetadataPayload> = {}): CoreMetadataPayload {
	return {
		protocols: {
			'parent#aave': {
				name: 'aave',
				displayName: 'Aave',
				tvl: true
			}
		},
		chains: {
			Ethereum: {
				name: 'Ethereum',
				id: 'ethereum'
			}
		},
		categoriesAndTags: {
			categories: [],
			tags: [],
			tagCategoryMap: {},
			configs: {}
		},
		cexs: [],
		rwaList: {
			canonicalMarketIds: [],
			platforms: [],
			chains: [],
			categories: [],
			assetGroups: [],
			idMap: {}
		},
		rwaPerpsList: {
			contracts: [],
			venues: [],
			categories: [],
			assetGroups: [],
			total: 0
		},
		tokenlist: {
			aave: defaultTokenListEntry
		},
		tokenDirectory: {},
		protocolDisplayNames: {
			aave: 'Aave'
		},
		chainDisplayNames: {
			ethereum: 'Ethereum'
		},
		chainCategories: [],
		liquidationsTokenSymbols: [],
		emissionsProtocolsList: [],
		emissionsSupplyMetrics: {},
		emissionsHistoricalPrices: {},
		cgExchangeIdentifiers: [],
		bridgeProtocolSlugs: [],
		bridgeChainSlugs: [],
		bridgeChainSlugToName: {},
		protocolLlamaswapDataset: {},
		narrativeCategories: { ids: [], nameById: {} },
		oracleRoutes: { oracleNameBySlug: {}, chainNameBySlug: {}, chainSlugsByOracleSlug: {} },
		digitalAssetTreasuryRoutes: { assetSlugs: [], companySlugs: [] },
		stablecoinPeggedAssetSlugs: [],
		...overrides
	}
}

function createDeferred<T>() {
	let resolve: (value: T) => void
	const promise = new Promise<T>((resolvePromise) => {
		resolve = resolvePromise
	})

	return {
		promise,
		resolve: resolve!
	}
}

describe('metadata refresh', () => {
	beforeEach(() => {
		vi.useRealTimers()
		vi.unstubAllEnvs()
		vi.restoreAllMocks()
		vi.resetModules()
		fetchCoreMetadataMock.mockReset()
		recordDomainEventMock.mockReset()
		bootArtifactsMock.mockReset()
		bootArtifactsMock.mockReturnValue({ manifest: null, payload: createMetadataPayload() })
		runOutsideRouteTelemetryMock.mockReset()
		runOutsideRouteTelemetryMock.mockImplementation((run: () => unknown) => run())
	})

	it('applies an empty token directory refresh payload directly', async () => {
		const { applyMetadataRefresh, createMetadataCacheFromArtifacts } = await import('../artifactContract')
		const existingDirectory = {
			aave: {
				name: 'Aave',
				symbol: 'AAVE',
				route: '/token/AAVE'
			}
		}
		const metadata = createMetadataCacheFromArtifacts(
			createMetadataPayload({
				tokenDirectory: existingDirectory
			})
		)

		applyMetadataRefresh(metadata, createMetadataPayload())

		expect(metadata.tokenDirectory).toEqual({})
	})

	it('applies empty protocol metadata refresh payloads directly', async () => {
		const { applyMetadataRefresh, createMetadataCacheFromArtifacts } = await import('../artifactContract')
		const existingProtocols = {
			'parent#aave': {
				name: 'aave',
				displayName: 'Aave',
				tvl: true
			}
		}
		const metadata = createMetadataCacheFromArtifacts(
			createMetadataPayload({
				protocols: existingProtocols,
				protocolDisplayNames: {
					aave: 'Aave'
				}
			})
		)

		applyMetadataRefresh(
			metadata,
			createMetadataPayload({
				protocols: {},
				protocolDisplayNames: {}
			})
		)

		expect(metadata.protocolMetadata).toEqual({})
		expect(metadata.protocolDisplayNames.size).toBe(0)
	})

	it('replaces the token directory when refresh returns token data', async () => {
		const { applyMetadataRefresh, createMetadataCacheFromArtifacts } = await import('../artifactContract')
		const refreshedDirectory = {
			morpho: {
				name: 'Morpho',
				symbol: 'MORPHO',
				route: '/token/MORPHO'
			}
		}
		const metadata = createMetadataCacheFromArtifacts(
			createMetadataPayload({
				tokenDirectory: {
					aave: {
						name: 'Aave',
						symbol: 'AAVE',
						route: '/token/AAVE'
					}
				}
			})
		)

		applyMetadataRefresh(
			metadata,
			createMetadataPayload({
				tokenDirectory: refreshedDirectory
			})
		)

		expect(metadata.tokenDirectory).toEqual(refreshedDirectory)
	})

	it('starts a background refresh without blocking and dedupes concurrent callers', async () => {
		const refreshedProtocols = {
			'parent#morpho': {
				name: 'morpho',
				displayName: 'Morpho',
				tvl: true
			}
		}
		const deferred = createDeferred<ReturnType<typeof createMetadataPayload>>()
		fetchCoreMetadataMock.mockReturnValue(deferred.promise)

		const metadataModule = await import('../index')
		const metadata = metadataModule.default
		const initialProtocolMetadata = metadata.protocolMetadata

		metadataModule.refreshMetadataInBackgroundIfStale()
		metadataModule.refreshMetadataInBackgroundIfStale()

		expect(fetchCoreMetadataMock).toHaveBeenCalledTimes(1)
		expect(metadata.protocolMetadata).toBe(initialProtocolMetadata)

		deferred.resolve(
			createMetadataPayload({
				protocols: refreshedProtocols,
				protocolDisplayNames: {
					morpho: 'Morpho'
				}
			})
		)
		await metadataModule.refreshMetadataIfStale()

		expect(metadata.protocolMetadata).toEqual(refreshedProtocols)
		expect(metadata.protocolDisplayNames.get('morpho')).toBe('Morpho')
		expect(fetchCoreMetadataMock).toHaveBeenCalledTimes(1)
	}, 15_000)

	it('detaches every background refresh caller from active route telemetry', async () => {
		fetchCoreMetadataMock.mockResolvedValue(createMetadataPayload())
		const metadataModule = await import('../index')

		metadataModule.refreshMetadataInBackgroundIfStale()
		metadataModule.refreshMetadataInBackgroundIfStale('homepage')

		expect(runOutsideRouteTelemetryMock).toHaveBeenCalledTimes(2)
		expect(fetchCoreMetadataMock).toHaveBeenCalledTimes(1)
	})

	it('records successful metadata refresh telemetry', async () => {
		vi.spyOn(Date, 'now')
			.mockReturnValueOnce(1_000)
			.mockReturnValueOnce(1_000)
			.mockReturnValueOnce(1_250)
			.mockReturnValue(1_250)
		fetchCoreMetadataMock.mockResolvedValue(createMetadataPayload())
		const metadataModule = await import('../index')

		await metadataModule.refreshMetadataIfStale()

		expect(recordDomainEventMock).toHaveBeenCalledWith(
			'metadata.refresh',
			'info',
			'manual',
			'Metadata refresh completed',
			{
				duration_ms: 250,
				source: 'manual',
				status: 'success'
			}
		)
	})

	it('records failed metadata refresh telemetry', async () => {
		const error = new Error('metadata failed')
		vi.spyOn(Date, 'now')
			.mockReturnValueOnce(1_000)
			.mockReturnValueOnce(1_000)
			.mockReturnValueOnce(1_400)
			.mockReturnValue(1_400)
		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
		fetchCoreMetadataMock.mockRejectedValue(error)
		const metadataModule = await import('../index')

		await metadataModule.refreshMetadataIfStale()

		expect(recordDomainEventMock).toHaveBeenCalledWith(
			'metadata.refresh',
			'warn',
			'manual',
			'Metadata refresh failed',
			{
				duration_ms: 400,
				error_message: 'metadata failed',
				error_name: 'Error',
				source: 'manual',
				status: 'failure'
			}
		)
		consoleErrorSpy.mockRestore()
	})

	it('applies the refresh cooldown after failed refreshes', async () => {
		vi.stubEnv('NODE_ENV', 'production')
		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
		fetchCoreMetadataMock.mockRejectedValue(new Error('metadata failed'))
		const metadataModule = await import('../index')

		await metadataModule.refreshMetadataIfStale()
		await metadataModule.refreshMetadataIfStale()

		expect(fetchCoreMetadataMock).toHaveBeenCalledTimes(1)
		expect(consoleErrorSpy).toHaveBeenCalledWith('[metadata] refresh failed, keeping stale cache:', expect.any(Error))
		consoleErrorSpy.mockRestore()
	})

	it('applies refresh payloads without semantic artifact validation', async () => {
		vi.stubEnv('NODE_ENV', 'production')
		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
		fetchCoreMetadataMock.mockResolvedValue(
			createMetadataPayload({
				chainCategories: {} as CoreMetadataPayload['chainCategories']
			})
		)
		const metadataModule = await import('../index')
		const metadata = metadataModule.default

		await metadataModule.refreshMetadataIfStale()

		expect(metadata.chainCategories).toEqual({})
		expect(metadataModule.getMetadataRefreshStatus().successfulRefreshes).toBe(1)
		expect(metadataModule.getMetadataRefreshStatus().failedRefreshes).toBe(0)
		expect(consoleErrorSpy).not.toHaveBeenCalled()
		consoleErrorSpy.mockRestore()
	})

	it('skips refresh in local development without an API key', async () => {
		vi.stubEnv('NODE_ENV', 'development')
		vi.stubEnv('API_KEY', '')
		const metadataModule = await import('../index')

		await metadataModule.refreshMetadataIfStale()
		metadataModule.refreshMetadataInBackgroundIfStale()

		expect(fetchCoreMetadataMock).not.toHaveBeenCalled()
	})

	it('runs the runtime refresh loop with initial and per-fetch jitter', async () => {
		vi.useFakeTimers()
		vi.setSystemTime(1_000)
		vi.stubEnv('NODE_ENV', 'production')
		bootArtifactsMock.mockReturnValue({
			manifest: {
				artifactVersion: 2,
				pulledAt: 0,
				status: 'ready',
				artifacts: []
			},
			payload: createMetadataPayload()
		})
		const randomSpy = vi.spyOn(Math, 'random')
		randomSpy.mockReturnValueOnce(0.5).mockReturnValueOnce(0.25)
		fetchCoreMetadataMock.mockResolvedValue(createMetadataPayload())

		await import('../index')
		await vi.advanceTimersByTimeAsync(150_000 - 1)
		expect(fetchCoreMetadataMock).not.toHaveBeenCalled()

		await vi.advanceTimersByTimeAsync(1)
		expect(fetchCoreMetadataMock).not.toHaveBeenCalled()

		await vi.advanceTimersByTimeAsync(75_000 - 1)
		expect(fetchCoreMetadataMock).not.toHaveBeenCalled()

		await vi.advanceTimersByTimeAsync(1)
		expect(fetchCoreMetadataMock).toHaveBeenCalledTimes(1)
		const metadataModule = await import('../index')
		expect(metadataModule.getMetadataRefreshStatus().jitteredRefreshAttempts).toBe(1)
	})

	it('does not start the runtime refresh loop in tests', async () => {
		vi.useFakeTimers()
		vi.setSystemTime(1_000)
		bootArtifactsMock.mockReturnValue({ manifest: null, payload: createMetadataPayload() })
		fetchCoreMetadataMock.mockResolvedValue(createMetadataPayload())

		await import('../index')
		await vi.advanceTimersByTimeAsync(60 * 60 * 1000)

		expect(fetchCoreMetadataMock).not.toHaveBeenCalled()
	})
})
