import { cp } from 'node:fs/promises'
import path from 'node:path'
import { buildAllDatasetDomains } from './builders'
import {
	getDatasetCacheMaxAgeMs,
	getDatasetCacheRootDir,
	isDatasetCacheStrict,
	shouldForceDatasetCacheRefresh,
	type DatasetCachePolicyPhase
} from './config'
import {
	ensureDirectory,
	DATASET_DOMAINS,
	type DatasetDomain,
	type DatasetManifest,
	pathExists,
	readDatasetManifestFrom,
	recoverDirectoryReplacement,
	removeDirectory,
	replaceDirectoryWithBackup,
	writeDatasetManifest
} from './core'

function shouldUseRecentDatasetCache(manifest: DatasetManifest): boolean {
	if (shouldForceDatasetCacheRefresh()) return false

	const maxAgeMs = getDatasetCacheMaxAgeMs()
	const now = Date.now()

	for (const domain of DATASET_DOMAINS) {
		const entry = manifest.domains[domain]
		if (entry.status !== 'ready' || now - entry.builtAt > maxAgeMs) {
			return false
		}
	}

	return now - manifest.builtAt <= maxAgeMs
}

function formatRefreshDomainFailure(domain: DatasetDomain, error: string, keptPreviousArtifacts: boolean): string {
	return `${domain}: ${error} (${keptPreviousArtifacts ? 'kept previous artifacts' : 'no previous ready artifacts'})`
}

type DatasetCacheLogger = Pick<Console, 'error' | 'log' | 'warn'>

async function preserveReadyDomainsForFailedRefresh({
	logger,
	manifest,
	currentManifest,
	rootDir,
	tempDir
}: {
	logger: DatasetCacheLogger
	manifest: DatasetManifest
	currentManifest: DatasetManifest | null
	rootDir: string
	tempDir: string
}): Promise<void> {
	const refreshFailures: string[] = []

	for (const domain of DATASET_DOMAINS) {
		const entry = manifest.domains[domain]
		if (entry.status !== 'failed') {
			continue
		}

		const currentEntry = currentManifest?.domains[domain]
		if (currentEntry?.status !== 'ready') {
			refreshFailures.push(formatRefreshDomainFailure(domain, entry.error, false))
			continue
		}

		const currentDomainDir = path.join(rootDir, domain)
		const nextDomainDir = path.join(tempDir, domain)
		if (!(await pathExists(currentDomainDir))) {
			refreshFailures.push(formatRefreshDomainFailure(domain, entry.error, false))
			continue
		}

		await removeDirectory(nextDomainDir)
		await cp(currentDomainDir, nextDomainDir, { recursive: true })
		manifest.domains[domain] = currentEntry
		refreshFailures.push(formatRefreshDomainFailure(domain, entry.error, true))
	}

	if (refreshFailures.length > 0) {
		logger.error(
			`[dataset-cache:refresh] failed for domains; previous cache was preserved where available:\n${refreshFailures.join('\n')}`
		)
	}
}

export async function publishDatasetCache({
	logger = console,
	phase = 'build'
}: { logger?: DatasetCacheLogger; phase?: DatasetCachePolicyPhase } = {}): Promise<void> {
	const rootDir = getDatasetCacheRootDir()
	const parentDir = path.dirname(rootDir)
	const tempDir = path.join(parentDir, `${path.basename(rootDir)}.tmp`)
	const backupDir = path.join(parentDir, `${path.basename(rootDir)}.bak`)

	await ensureDirectory(parentDir)

	try {
		await recoverDirectoryReplacement(rootDir, backupDir)
		const currentManifest = await readDatasetManifestFrom(rootDir).catch(() => null)
		if (currentManifest && shouldUseRecentDatasetCache(currentManifest)) {
			logger.log('[dev:prepare] Dataset cache: recently built; skipping rebuild')
			return
		}

		await removeDirectory(tempDir)
		await ensureDirectory(tempDir)

		const strict = isDatasetCacheStrict({ phase })
		const manifest = await buildAllDatasetDomains(
			tempDir,
			phase === 'refresh' ? { failureLogPrefix: null, logger, strict } : { logger, strict }
		)
		if (phase === 'refresh') {
			await preserveReadyDomainsForFailedRefresh({ logger, manifest, currentManifest, rootDir, tempDir })
		}
		await writeDatasetManifest(manifest, tempDir)
		await readDatasetManifestFrom(tempDir)

		// Publish only after the new tree is complete and manifest-readable.
		// Failed domains are represented in the manifest; missing manifests are not.
		await replaceDirectoryWithBackup({
			targetDir: rootDir,
			nextDir: tempDir,
			backupDir
		})
	} catch (error) {
		await removeDirectory(tempDir)
		if (phase === 'refresh') {
			logger.error('[dataset-cache:refresh] failed; keeping previous cache:', error)
		}
		throw error
	}
}
