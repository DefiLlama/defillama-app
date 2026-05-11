import type { CoreMetadataPayload } from '../../src/utils/metadata/artifactContract'
import {
	getMetadataCacheDir,
	getMissingMetadataArtifacts,
	hasMetadataArtifactFiles,
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
	const hasCompleteArtifacts = manifest ? await hasMetadataArtifactFiles(cacheDir, manifest) : false
	const missingArtifacts =
		manifest && !hasCompleteArtifacts ? await getMissingMetadataArtifacts(cacheDir, manifest) : []

	if (isLocalDevWithoutApiKey(env)) {
		if (manifest?.status === 'ready' && hasCompleteArtifacts) {
			logger.log('[dev:prepare] Metadata cache: no API_KEY in local development; using existing cache')
			return { exitCode: 0 }
		}
		if (manifest?.status === 'ready') {
			logger.log(
				`[dev:prepare] Metadata cache: no API_KEY and existing cache is missing ${missingArtifacts.join(', ')}; writing stubs for missing artifacts`
			)
		}
		logger.log('[dev:prepare] Metadata cache: no API_KEY in local development; using existing cache or empty stubs')
		await writeMissingMetadataStubArtifacts(cacheDir, now)
		return { exitCode: 0 }
	}

	if (isMetadataArtifactManifestFresh(manifest, now) && hasCompleteArtifacts) {
		logger.log('[dev:prepare] Metadata cache: recently refreshed; skipping pull')
		return { exitCode: 0 }
	}
	if (isMetadataArtifactManifestFresh(manifest, now)) {
		logger.log(
			`[dev:prepare] Metadata cache: manifest is fresh but missing ${missingArtifacts.join(', ')}; pulling again`
		)
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

		logger.log('[dev:prepare] Metadata cache: pulled and cached data')
		return { exitCode: 0 }
	} catch (error) {
		logger.log('[dev:prepare] Metadata cache: failed to pull data', error)

		if (shouldWriteMetadataStubsOnFailure(env)) {
			logger.log('[dev:prepare] Metadata cache: writing empty stubs so local dev and CI can proceed')
			await writeMissingMetadataStubArtifacts(cacheDir, now)
			return { exitCode: 0 }
		}

		return { exitCode: 1 }
	}
}
