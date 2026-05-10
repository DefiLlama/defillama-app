import path from 'node:path'
import { buildAllDatasetDomains } from './builders'
import {
	ensureDirectory,
	getDatasetCacheRootDir,
	type DatasetManifest,
	readDatasetManifestFrom,
	recoverDirectoryReplacement,
	removeDirectory,
	replaceDirectoryWithBackup,
	writeDatasetManifest
} from './core'

const DEFAULT_DATASET_CACHE_MAX_AGE_MS = 5 * 60 * 1000

function getDatasetCacheMaxAgeMs(): number {
	const raw = process.env.DATASET_CACHE_MAX_AGE_MS
	if (raw == null) return DEFAULT_DATASET_CACHE_MAX_AGE_MS

	const parsed = Number(raw)
	return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_DATASET_CACHE_MAX_AGE_MS
}

function shouldUseRecentDatasetCache(manifest: DatasetManifest): boolean {
	if (process.env.DATASET_CACHE_FORCE_REFRESH === '1') return false

	const maxAgeMs = getDatasetCacheMaxAgeMs()
	return Date.now() - manifest.builtAt <= maxAgeMs
}

export async function publishDatasetCache(): Promise<void> {
	const rootDir = getDatasetCacheRootDir()
	const parentDir = path.dirname(rootDir)
	const tempDir = path.join(parentDir, `${path.basename(rootDir)}.tmp`)
	const backupDir = path.join(parentDir, `${path.basename(rootDir)}.bak`)

	await ensureDirectory(parentDir)

	try {
		await recoverDirectoryReplacement(rootDir, backupDir)
		const currentManifest = await readDatasetManifestFrom(rootDir).catch(() => null)
		if (currentManifest && shouldUseRecentDatasetCache(currentManifest)) {
			console.log('[buildDatasetCache] Dataset cache was built recently. No need to rebuild.')
			return
		}

		await removeDirectory(tempDir)
		await ensureDirectory(tempDir)

		const manifest = await buildAllDatasetDomains(tempDir)
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
		throw error
	}
}
