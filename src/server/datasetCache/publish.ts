import path from 'node:path'
import { buildAllDatasetDomains } from './builders'
import {
	ensureDirectory,
	getDatasetCacheRootDir,
	readDatasetManifestFrom,
	recoverDirectoryReplacement,
	removeDirectory,
	replaceDirectoryWithBackup,
	writeDatasetManifest
} from './core'

export async function publishDatasetCache(): Promise<void> {
	const rootDir = getDatasetCacheRootDir()
	const parentDir = path.dirname(rootDir)
	const tempDir = path.join(parentDir, `${path.basename(rootDir)}.tmp`)
	const backupDir = path.join(parentDir, `${path.basename(rootDir)}.bak`)
	const metadataModule = await import('~/utils/metadata')

	await ensureDirectory(parentDir)
	await metadataModule.refreshMetadataIfStale()
	await recoverDirectoryReplacement(rootDir, backupDir)
	await removeDirectory(tempDir)
	await ensureDirectory(tempDir)

	try {
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
