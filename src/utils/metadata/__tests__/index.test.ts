import { beforeEach, describe, expect, it, vi } from 'vitest'

const { fetchCoreMetadataMock } = vi.hoisted(() => ({
	fetchCoreMetadataMock: vi.fn()
}))

vi.mock('../fetch', () => ({
	fetchCoreMetadata: fetchCoreMetadataMock
}))

function createMetadataPayload(overrides: Record<string, unknown> = {}) {
	return {
		protocols: {},
		chains: {},
		categoriesAndTags: {
			categories: [],
			tags: [],
			tagCategoryMap: {}
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
		tokenlist: {},
		tokenDirectory: {},
		protocolDisplayNames: {},
		chainDisplayNames: {},
		liquidationsTokenSymbols: [],
		emissionsProtocolsList: [],
		cgExchangeIdentifiers: [],
		bridgeProtocolSlugs: [],
		bridgeChainSlugs: [],
		bridgeChainSlugToName: {},
		protocolLlamaswapDataset: {},
		...overrides
	}
}

describe('metadata refresh', () => {
	beforeEach(() => {
		vi.resetModules()
		fetchCoreMetadataMock.mockReset()
	})

	it('keeps the existing token directory when a refresh returns an empty one', async () => {
		fetchCoreMetadataMock.mockResolvedValue(createMetadataPayload())

		const metadataModule = await import('../index')
		const metadata = metadataModule.default
		const existingDirectory = {
			aave: {
				name: 'Aave',
				symbol: 'AAVE',
				route: '/token/AAVE'
			}
		}
		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

		metadata.tokenDirectory = existingDirectory

		await metadataModule.refreshMetadataIfStale()

		expect(metadata.tokenDirectory).toEqual(existingDirectory)
		expect(consoleErrorSpy).toHaveBeenCalledWith(
			'[metadata] refresh returned an empty token directory, keeping stale cache'
		)

		consoleErrorSpy.mockRestore()
	}, 15_000)

	it('replaces the token directory when refresh returns token data', async () => {
		const refreshedDirectory = {
			morpho: {
				name: 'Morpho',
				symbol: 'MORPHO',
				route: '/token/MORPHO'
			}
		}
		fetchCoreMetadataMock.mockResolvedValue(
			createMetadataPayload({
				tokenDirectory: refreshedDirectory
			})
		)

		const metadataModule = await import('../index')
		const metadata = metadataModule.default

		metadata.tokenDirectory = {
			aave: {
				name: 'Aave',
				symbol: 'AAVE',
				route: '/token/AAVE'
			}
		}

		await metadataModule.refreshMetadataIfStale()

		expect(metadata.tokenDirectory).toEqual(refreshedDirectory)
	}, 15_000)
})
