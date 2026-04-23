import path from 'node:path'
import { buildAllDatasetDomains } from '../src/server/datasetCache/builders'
import {
	ensureDirectory,
	getDatasetCacheRootDir,
	readDatasetManifestFrom,
	recoverDirectoryReplacement,
	removeDirectory,
	replaceDirectoryWithBackup,
	writeDatasetManifest
} from '../src/server/datasetCache/core'

async function main() {
	const rootDir = getDatasetCacheRootDir()
	const parentDir = path.dirname(rootDir)
	const tempDir = path.join(parentDir, `${path.basename(rootDir)}.tmp`)
	const backupDir = path.join(parentDir, `${path.basename(rootDir)}.bak`)
	const metadataModule = await import('../src/utils/metadata')

	await ensureDirectory(parentDir)
	await metadataModule.refreshMetadataIfStale()
	await recoverDirectoryReplacement(rootDir, backupDir)
	await removeDirectory(tempDir)
	await ensureDirectory(tempDir)

	try {
		const manifest = await buildAllDatasetDomains(tempDir)
		await writeDatasetManifest(manifest, tempDir)
		await readDatasetManifestFrom(tempDir)

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

main().catch((error) => {
	console.error('[buildDatasetCache] Failed to build dataset cache', error)
	process.exit(1)
})
