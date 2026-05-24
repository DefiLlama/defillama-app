import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { METADATA_ARTIFACT_FILES, type CoreMetadataPayload } from '../artifactContract'
import { loadMetadataArtifactsFromDisk } from '../artifacts'
import { writeMetadataArtifacts } from '../artifactWriter'

const tempDirs: string[] = []

function createPayload(): CoreMetadataPayload {
	return {
		protocols: { 'parent#aave': { name: 'aave', displayName: 'Aave', tvl: true } },
		chains: { Ethereum: { name: 'Ethereum', id: 'ethereum' } },
		categoriesAndTags: { categories: [], tags: [], tagCategoryMap: {}, configs: {} },
		cexs: [],
		rwaList: { canonicalMarketIds: [], platforms: [], chains: [], categories: [], assetGroups: [], idMap: {} },
		rwaPerpsList: { contracts: [], venues: [], categories: [], assetGroups: [], total: 0 },
		tokenlist: {},
		tokenDirectory: {},
		protocolDisplayNames: { aave: 'Aave' },
		chainDisplayNames: { ethereum: 'Ethereum' },
		chainCategories: ['EVM'],
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
		stablecoinPeggedAssetSlugs: []
	}
}

async function createTempDir(): Promise<string> {
	const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'metadata-artifacts-test-'))
	tempDirs.push(tempDir)
	return tempDir
}

afterEach(async () => {
	await Promise.all(tempDirs.splice(0).map((tempDir) => fs.rm(tempDir, { recursive: true, force: true })))
})

describe('metadata artifact loader', () => {
	it('loads generated artifacts from disk through the registry', async () => {
		const cacheDir = await createTempDir()
		await writeMetadataArtifacts(cacheDir, createPayload(), 'ready', 123)

		const artifacts = loadMetadataArtifactsFromDisk(cacheDir)

		expect(artifacts.manifest?.pulledAt).toBe(123)
		expect(artifacts.payload.protocols['parent#aave'].displayName).toBe('Aave')
		expect(artifacts.payload.chainCategories).toEqual(['EVM'])
	})

	it('loads parsed JSON artifacts without semantic validation', async () => {
		const cacheDir = await createTempDir()
		await writeMetadataArtifacts(cacheDir, createPayload(), 'ready', 123)
		await fs.writeFile(path.join(cacheDir, METADATA_ARTIFACT_FILES.chains), JSON.stringify([]))

		expect(loadMetadataArtifactsFromDisk(cacheDir).payload.chains).toEqual([])
	})
})
