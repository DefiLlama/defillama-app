import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CoreMetadataPayload } from '../artifactContract'

const { fetchCoreMetadataMock, runOutsideRouteTelemetryMock } = vi.hoisted(() => ({
	fetchCoreMetadataMock: vi.fn(),
	runOutsideRouteTelemetryMock: vi.fn((run: () => unknown) => run())
}))

vi.mock('../fetch', () => ({
	fetchCoreMetadata: fetchCoreMetadataMock
}))

vi.mock('~/utils/telemetry', () => ({
	runOutsideRouteTelemetry: runOutsideRouteTelemetryMock
}))

vi.mock('../../../.cache/app-metadata/bridgeChainSlugs.json', () => ({ default: [] }))
vi.mock('../../../.cache/app-metadata/bridgeChainSlugToName.json', () => ({ default: {} }))
vi.mock('../../../.cache/app-metadata/bridgeProtocolSlugs.json', () => ({ default: [] }))
vi.mock('../../../.cache/app-metadata/categoriesAndTags.json', () => ({
	default: { categories: [], tags: [], tagCategoryMap: {}, configs: {} }
}))
vi.mock('../../../.cache/app-metadata/cexs.json', () => ({ default: [] }))
vi.mock('../../../.cache/app-metadata/cgExchangeIdentifiers.json', () => ({ default: [] }))
vi.mock('../../../.cache/app-metadata/chainDisplayNames.json', () => ({ default: {} }))
vi.mock('../../../.cache/app-metadata/chains.json', () => ({ default: {} }))
vi.mock('../../../.cache/app-metadata/emissionsHistoricalPrices.json', () => ({ default: {} }))
vi.mock('../../../.cache/app-metadata/emissionsProtocolsList.json', () => ({ default: [] }))
vi.mock('../../../.cache/app-metadata/liquidationsTokenSymbols.json', () => ({ default: [] }))
vi.mock('../../../.cache/app-metadata/llamaswap-protocols.json', () => ({ default: {} }))
vi.mock('../../../.cache/app-metadata/protocolDisplayNames.json', () => ({ default: {} }))
vi.mock('../../../.cache/app-metadata/protocols.json', () => ({ default: {} }))
vi.mock('../../../.cache/app-metadata/rwa.json', () => ({
	default: { canonicalMarketIds: [], platforms: [], chains: [], categories: [], assetGroups: [], idMap: {} }
}))
vi.mock('../../../.cache/app-metadata/rwaPerps.json', () => ({
	default: { contracts: [], venues: [], categories: [], assetGroups: [], total: 0 }
}))
vi.mock('../../../.cache/app-metadata/tokenlist.json', () => ({ default: {} }))
vi.mock('../../../.cache/app-metadata/tokens.json', () => ({ default: {} }))

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
		liquidationsTokenSymbols: [],
		emissionsProtocolsList: [],
		emissionsHistoricalPrices: {},
		cgExchangeIdentifiers: [],
		bridgeProtocolSlugs: [],
		bridgeChainSlugs: [],
		bridgeChainSlugToName: {},
		protocolLlamaswapDataset: {},
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
		vi.unstubAllEnvs()
		vi.resetModules()
		fetchCoreMetadataMock.mockReset()
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

	it('skips refresh in local development without an API key', async () => {
		vi.stubEnv('NODE_ENV', 'development')
		vi.stubEnv('API_KEY', '')
		const metadataModule = await import('../index')

		await metadataModule.refreshMetadataIfStale()
		metadataModule.refreshMetadataInBackgroundIfStale()

		expect(fetchCoreMetadataMock).not.toHaveBeenCalled()
	})
})
