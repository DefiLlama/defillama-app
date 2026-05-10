import path from 'node:path'
import { buildAllDatasetDomains } from './builders'
import { getDatasetCacheMaxAgeMs, getDatasetCacheRootDir, shouldForceDatasetCacheRefresh } from './config'
import {
	ensureDirectory,
	type DatasetManifest,
	readDatasetManifestFrom,
	recoverDirectoryReplacement,
	removeDirectory,
	replaceDirectoryWithBackup,
	writeDatasetManifest
} from './core'

function shouldUseRecentDatasetCache(manifest: DatasetManifest): boolean {
	if (shouldForceDatasetCacheRefresh()) return false

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
