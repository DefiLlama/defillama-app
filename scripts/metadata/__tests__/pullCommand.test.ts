import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { METADATA_ARTIFACT_FILES, type CoreMetadataPayload } from '../../../src/utils/metadata/artifactContract'
import {
	getMetadataCacheDir,
	readMetadataArtifactManifest,
	writeMetadataArtifacts
} from '../../../src/utils/metadata/artifactWriter'
import { METADATA_MANIFEST_FILE, createMetadataArtifactManifest } from '../../../src/utils/metadata/manifest'
import { runPullMetadataCommand } from '../pullCommand'

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
		protocols: { 'parent#aave': { name: 'aave', displayName: 'Aave', tvl: true } },
		chains: { Ethereum: { name: 'Ethereum', id: 'ethereum' } },
		categoriesAndTags: { categories: [], tags: [], tagCategoryMap: {}, configs: {} },
		cexs: [],
		rwaList: { canonicalMarketIds: [], platforms: [], chains: [], categories: [], assetGroups: [], idMap: {} },
		rwaPerpsList: { contracts: [], venues: [], categories: [], assetGroups: [], total: 0 },
		tokenlist: { aave: tokenEntry },
		tokenDirectory: {},
		protocolDisplayNames: { aave: 'Aave' },
		chainDisplayNames: { ethereum: 'Ethereum' },
		liquidationsTokenSymbols: [],
		emissionsProtocolsList: [],
		cgExchangeIdentifiers: [],
		bridgeProtocolSlugs: [],
		bridgeChainSlugs: [],
		bridgeChainSlugToName: {},
		protocolLlamaswapDataset: {}
	}
}

async function createRepoRoot(): Promise<string> {
	const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'metadata-command-test-'))
	tempDirs.push(repoRoot)
	await fs.mkdir(path.join(repoRoot, 'public'), { recursive: true })
	await fs.writeFile(path.join(repoRoot, 'public', 'pages.json'), JSON.stringify({ Metrics: [], Tools: [] }))
	return repoRoot
}

afterEach(async () => {
	await Promise.all(tempDirs.splice(0).map((tempDir) => fs.rm(tempDir, { recursive: true, force: true })))
})

describe('pull metadata command', () => {
	it('skips pulls when the metadata manifest is fresh', async () => {
		const repoRoot = await createRepoRoot()
		const cacheDir = getMetadataCacheDir(repoRoot)
		await writeMetadataArtifacts(cacheDir, createPayload(), 'ready', 1_000)
		const fetchMetadata = vi.fn()

		const result = await runPullMetadataCommand({
			env: { NODE_ENV: 'production' } as NodeJS.ProcessEnv,
			fetchMetadata,
			logger: { log: vi.fn() },
			now: 1_100,
			repoRoot
		})

		expect(result.exitCode).toBe(0)
		expect(fetchMetadata).not.toHaveBeenCalled()
	})

	it('pulls again when a fresh ready manifest has missing artifacts', async () => {
		const repoRoot = await createRepoRoot()
		const cacheDir = getMetadataCacheDir(repoRoot)
		await writeMetadataArtifacts(cacheDir, createPayload(), 'ready', 1_000)
		await fs.rm(path.join(cacheDir, METADATA_ARTIFACT_FILES.cexs))
		const fetchMetadata = vi.fn().mockResolvedValue(createPayload())

		const result = await runPullMetadataCommand({
			env: { NODE_ENV: 'production' } as NodeJS.ProcessEnv,
			fetchMetadata,
			fetchMetrics: vi.fn().mockResolvedValue({ tastyMetrics: {}, trendingRoutes: [] }),
			logger: { log: vi.fn() },
			now: 1_100,
			repoRoot
		})

		expect(result.exitCode).toBe(0)
		expect(fetchMetadata).toHaveBeenCalledTimes(1)
		expect(await fs.readFile(path.join(cacheDir, METADATA_ARTIFACT_FILES.cexs), 'utf8')).toBe('[]')
	})

	it('pulls stale or missing metadata and writes ready artifacts', async () => {
		const repoRoot = await createRepoRoot()
		const result = await runPullMetadataCommand({
			env: { NODE_ENV: 'production' } as NodeJS.ProcessEnv,
			fetchMetadata: vi.fn().mockResolvedValue(createPayload()),
			fetchMetrics: vi.fn().mockResolvedValue({ tastyMetrics: {}, trendingRoutes: [] }),
			logger: { log: vi.fn() },
			now: 2_000,
			repoRoot
		})

		const cacheDir = getMetadataCacheDir(repoRoot)
		expect(result.exitCode).toBe(0)
		expect((await readMetadataArtifactManifest(cacheDir))?.status).toBe('ready')
		expect(JSON.parse(await fs.readFile(path.join(cacheDir, METADATA_ARTIFACT_FILES.tokenlist), 'utf8'))).toEqual({
			aave: tokenEntry
		})
	})

	it('writes stubs and exits successfully for local development without an API key', async () => {
		const repoRoot = await createRepoRoot()
		const fetchMetadata = vi.fn()

		const result = await runPullMetadataCommand({
			env: { API_KEY: '', NODE_ENV: 'development' } as NodeJS.ProcessEnv,
			fetchMetadata,
			logger: { log: vi.fn() },
			now: 3_000,
			repoRoot
		})

		const cacheDir = getMetadataCacheDir(repoRoot)
		expect(result.exitCode).toBe(0)
		expect(fetchMetadata).not.toHaveBeenCalled()
		expect((await readMetadataArtifactManifest(cacheDir))?.status).toBe('stub')
		expect(JSON.parse(await fs.readFile(path.join(cacheDir, METADATA_ARTIFACT_FILES.protocols), 'utf8'))).toEqual({})
	})

	it('keeps an existing ready manifest in local development without an API key', async () => {
		const repoRoot = await createRepoRoot()
		const cacheDir = getMetadataCacheDir(repoRoot)
		await writeMetadataArtifacts(cacheDir, createPayload(), 'ready', 3_000)
		const fetchMetadata = vi.fn()

		const result = await runPullMetadataCommand({
			env: { API_KEY: '', NODE_ENV: 'development' } as NodeJS.ProcessEnv,
			fetchMetadata,
			logger: { log: vi.fn() },
			now: 4_000,
			repoRoot
		})

		expect(result.exitCode).toBe(0)
		expect(fetchMetadata).not.toHaveBeenCalled()
		expect((await readMetadataArtifactManifest(cacheDir))?.status).toBe('ready')
	})

	it('exits non-zero after production CI pull failures', async () => {
		const repoRoot = await createRepoRoot()

		const result = await runPullMetadataCommand({
			env: { CI: 'true', NODE_ENV: 'production' } as NodeJS.ProcessEnv,
			fetchMetadata: vi.fn().mockRejectedValue(new Error('upstream failed')),
			logger: { log: vi.fn() },
			now: 4_000,
			repoRoot
		})

		expect(result.exitCode).toBe(1)
		await expect(readMetadataArtifactManifest(getMetadataCacheDir(repoRoot))).resolves.toBeNull()
	})

	it('writes stubs and exits successfully after development pull failures', async () => {
		const repoRoot = await createRepoRoot()

		const result = await runPullMetadataCommand({
			env: { API_KEY: 'dev-key', NODE_ENV: 'development' } as NodeJS.ProcessEnv,
			fetchMetadata: vi.fn().mockRejectedValue(new Error('upstream failed')),
			logger: { log: vi.fn() },
			now: 4_000,
			repoRoot
		})

		expect(result.exitCode).toBe(0)
		expect((await readMetadataArtifactManifest(getMetadataCacheDir(repoRoot)))?.status).toBe('stub')
	})

	it('exits non-zero after production pull failures', async () => {
		const repoRoot = await createRepoRoot()

		const result = await runPullMetadataCommand({
			env: { NODE_ENV: 'production' } as NodeJS.ProcessEnv,
			fetchMetadata: vi.fn().mockRejectedValue(new Error('upstream failed')),
			logger: { log: vi.fn() },
			now: 5_000,
			repoRoot
		})

		expect(result.exitCode).toBe(1)
		await expect(readMetadataArtifactManifest(getMetadataCacheDir(repoRoot))).resolves.toBeNull()
	})

	it('leaves an existing ready artifact set intact after production pull failures', async () => {
		const repoRoot = await createRepoRoot()
		const cacheDir = getMetadataCacheDir(repoRoot)
		await fs.mkdir(cacheDir, { recursive: true })
		await fs.writeFile(
			path.join(cacheDir, METADATA_MANIFEST_FILE),
			JSON.stringify(createMetadataArtifactManifest('ready', 1_000), null, 2)
		)
		await fs.writeFile(
			path.join(cacheDir, METADATA_ARTIFACT_FILES.protocols),
			JSON.stringify({ aave: { name: 'Aave' } })
		)

		const result = await runPullMetadataCommand({
			env: { NODE_ENV: 'production' } as NodeJS.ProcessEnv,
			fetchMetadata: vi.fn().mockRejectedValue(new Error('upstream failed')),
			logger: { log: vi.fn() },
			now: 400_000,
			repoRoot
		})

		expect(result.exitCode).toBe(1)
		expect((await readMetadataArtifactManifest(cacheDir))?.status).toBe('ready')
		expect(JSON.parse(await fs.readFile(path.join(cacheDir, METADATA_ARTIFACT_FILES.protocols), 'utf8'))).toEqual({
			aave: { name: 'Aave' }
		})
	})

	it('keeps metadata publishing successful when Tasty metrics fail', async () => {
		const repoRoot = await createRepoRoot()

		const result = await runPullMetadataCommand({
			env: { NODE_ENV: 'production' } as NodeJS.ProcessEnv,
			fetchMetadata: vi.fn().mockResolvedValue(createPayload()),
			fetchMetrics: vi.fn().mockRejectedValue(new Error('metrics failed')),
			logger: { log: vi.fn() },
			now: 6_000,
			repoRoot
		})

		expect(result.exitCode).toBe(0)
		expect((await readMetadataArtifactManifest(getMetadataCacheDir(repoRoot)))?.status).toBe('ready')
	})
})
