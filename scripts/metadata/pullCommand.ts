import type { CoreMetadataPayload } from '../../src/utils/metadata/artifactContract'
import {
	getMetadataCacheDir,
	readMetadataArtifactManifest,
	writeMetadataArtifacts,
	writeMissingMetadataStubArtifacts
} from '../../src/utils/metadata/artifactWriter'
import { fetchCoreMetadata } from '../../src/utils/metadata/fetch'
import { isMetadataArtifactManifestFresh } from '../../src/utils/metadata/manifest'
import { isLocalDevWithoutApiKey, shouldWriteMetadataStubsOnFailure } from '../../src/utils/metadata/policy'
import {
	buildPagesWithTastyMetrics,
	buildTrendingPages,
	loadDefillamaPages,
	writePagesAndTrendingIfNeeded
} from './pages'
import { fetchTastyMetrics, type TastyMetricsEnv, type TastyMetricsResult } from './tastyMetrics'

type PullMetadataCommandOptions = {
	env?: NodeJS.ProcessEnv
	fetchMetadata?: () => Promise<CoreMetadataPayload>
	fetchMetrics?: (options: { endAt: number; env: TastyMetricsEnv; startAt: number }) => Promise<TastyMetricsResult>
	logger?: Pick<Console, 'log'>
	now?: number
	repoRoot?: string
}

export type PullMetadataCommandResult = {
	exitCode: 0 | 1
}

export async function runPullMetadataCommand({
	env = process.env,
	fetchMetadata = fetchCoreMetadata,
	fetchMetrics = fetchTastyMetrics,
	logger = console,
	now = Date.now(),
	repoRoot = process.cwd()
}: PullMetadataCommandOptions = {}): Promise<PullMetadataCommandResult> {
	const cacheDir = getMetadataCacheDir(repoRoot)
	const manifest = await readMetadataArtifactManifest(cacheDir)

	if (isLocalDevWithoutApiKey(env)) {
		if (manifest?.status === 'ready') {
			logger.log('No API_KEY in local development — using existing metadata cache.')
			return { exitCode: 0 }
		}
		logger.log('No API_KEY in local development — using existing metadata cache or empty stubs.')
		await writeMissingMetadataStubArtifacts(cacheDir, now)
		return { exitCode: 0 }
	}

	if (isMetadataArtifactManifestFresh(manifest, now)) {
		logger.log('Metadata was pulled recently. No need to pull again.')
		return { exitCode: 0 }
	}

	const endAt = now
	const startAt = endAt - 1000 * 60 * 60 * 24 * 90

	try {
		const [metadataPayload, metrics] = await Promise.all([
			fetchMetadata(),
			fetchMetrics({ endAt, env, startAt }).catch((error): TastyMetricsResult => {
				logger.log('Error fetching tasty metrics', error)
				return { tastyMetrics: {}, trendingRoutes: [] }
			})
		])

		await writeMetadataArtifacts(cacheDir, metadataPayload, 'ready', now)

		const defillamaPages = await loadDefillamaPages(repoRoot, logger)
		const finalDefillamaPages = buildPagesWithTastyMetrics(defillamaPages, metrics.tastyMetrics)
		const trendingPages = buildTrendingPages(defillamaPages, metrics.trendingRoutes)
		await writePagesAndTrendingIfNeeded(repoRoot, finalDefillamaPages, trendingPages)

		logger.log('Data pulled and cached successfully.')
		return { exitCode: 0 }
	} catch (error) {
		logger.log('Error pulling data:', error)

		if (shouldWriteMetadataStubsOnFailure(env)) {
			logger.log('Writing empty metadata stub cache so local dev and CI can proceed.')
			await writeMissingMetadataStubArtifacts(cacheDir, now)
			return { exitCode: 0 }
		}

		return { exitCode: 1 }
	}
}
