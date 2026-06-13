import path from 'node:path'
import { fetchRaisesFromNetwork } from '~/containers/Raises/api'
import { DATASET_DOMAIN_ARTIFACTS } from '~/server/datasetCache/artifacts'
import type { DatasetDomainBuildResult } from '~/server/datasetCache/buildTypes'
import { writeDatasetCacheJson as writeJsonFile } from '~/server/datasetCache/jsonCache'
import { ensureDirectory } from '~/utils/cacheDirectory'

export async function buildRaisesDomain(rootDir: string): Promise<DatasetDomainBuildResult> {
	const builtAt = Date.now()
	const domainDir = path.join(rootDir, 'raises')
	const files = DATASET_DOMAIN_ARTIFACTS.raises.files
	await ensureDirectory(domainDir)

	const raises = await fetchRaisesFromNetwork()
	await writeJsonFile(path.join(domainDir, files.full), raises)

	return { builtAt }
}
