import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { METADATA_ARTIFACT_FILES, type CoreMetadataPayload } from '../artifactContract'
import {
	getMetadataManifestPath,
	readMetadataArtifactManifest,
	writeMetadataArtifacts,
	writeMissingMetadataStubArtifacts
} from '../artifactWriter'
import { METADATA_ARTIFACT_VERSION, createMetadataArtifactManifest, isMetadataArtifactManifestFresh } from '../manifest'

const tempDirs: string[] = []

const tokenEntry = {
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

function createPayload(): CoreMetadataPayload {
	return {
		protocols: {},
		chains: {},
		categoriesAndTags: { categories: [], tags: [], tagCategoryMap: {}, configs: {} },
		cexs: [],
		rwaList: { canonicalMarketIds: [], platforms: [], chains: [], categories: [], assetGroups: [], idMap: {} },
		rwaPerpsList: { contracts: [], venues: [], categories: [], assetGroups: [], total: 0 },
		tokenlist: { aave: tokenEntry },
		tokenDirectory: {},
		protocolDisplayNames: {},
		chainDisplayNames: {},
		liquidationsTokenSymbols: [],
		emissionsProtocolsList: [],
		cgExchangeIdentifiers: [],
		bridgeProtocolSlugs: [],
		bridgeChainSlugs: [],
		bridgeChainSlugToName: {},
		protocolLlamaswapDataset: {}
	}
}

async function createTempDir(): Promise<string> {
	const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'metadata-manifest-test-'))
	tempDirs.push(tempDir)
	return tempDir
}

afterEach(async () => {
	await Promise.all(tempDirs.splice(0).map((tempDir) => fs.rm(tempDir, { recursive: true, force: true })))
})

describe('metadata artifact manifest', () => {
	it('records ready artifacts after a successful publish', async () => {
		const cacheDir = await createTempDir()
		await writeMetadataArtifacts(cacheDir, createPayload(), 'ready', 123)

		const manifest = await readMetadataArtifactManifest(cacheDir)
		expect(manifest).toEqual({
			artifactVersion: METADATA_ARTIFACT_VERSION,
			pulledAt: 123,
			status: 'ready',
			artifacts: Object.values(METADATA_ARTIFACT_FILES)
		})
		expect(JSON.parse(await fs.readFile(path.join(cacheDir, METADATA_ARTIFACT_FILES.tokenlist), 'utf8'))).toEqual({
			aave: tokenEntry
		})
	})

	it('records stub artifacts without overwriting existing artifact files', async () => {
		const cacheDir = await createTempDir()
		await fs.writeFile(
			path.join(cacheDir, METADATA_ARTIFACT_FILES.protocols),
			JSON.stringify({ aave: { name: 'Aave' } })
		)

		await writeMissingMetadataStubArtifacts(cacheDir, 456)

		const manifest = await readMetadataArtifactManifest(cacheDir)
		expect(manifest?.status).toBe('stub')
		expect(manifest?.pulledAt).toBe(456)
		expect(JSON.parse(await fs.readFile(path.join(cacheDir, METADATA_ARTIFACT_FILES.protocols), 'utf8'))).toEqual({
			aave: { name: 'Aave' }
		})
		expect(await fs.readFile(getMetadataManifestPath(cacheDir), 'utf8')).toContain('"status": "stub"')
	})

	it('treats only fresh ready manifests as pull skips', () => {
		expect(isMetadataArtifactManifestFresh(createMetadataArtifactManifest('ready', 1_000), 1_100, 500)).toBe(true)
		expect(isMetadataArtifactManifestFresh(createMetadataArtifactManifest('stub', 1_000), 1_100, 500)).toBe(false)
		expect(isMetadataArtifactManifestFresh(createMetadataArtifactManifest('ready', 1_000), 2_000, 500)).toBe(false)
		expect(isMetadataArtifactManifestFresh(createMetadataArtifactManifest('ready', 2_000), 1_000, 500)).toBe(false)
		expect(isMetadataArtifactManifestFresh(null, 1_100, 500)).toBe(false)
	})
})
