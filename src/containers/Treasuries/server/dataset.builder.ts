import path from 'node:path'
import { fetchTreasuriesFromNetwork } from '~/containers/Treasuries/api'
import { DATASET_DOMAIN_ARTIFACTS } from '~/server/datasetCache/artifacts'
import type { DatasetDomainBuildResult } from '~/server/datasetCache/buildTypes'
import { writeDatasetCacheJson as writeJsonFile } from '~/server/datasetCache/jsonCache'
import { ensureDirectory } from '~/utils/cacheDirectory'

export async function buildTreasuriesDomain(rootDir: string): Promise<DatasetDomainBuildResult> {
	const builtAt = Date.now()
	const domainDir = path.join(rootDir, 'treasuries')
	const files = DATASET_DOMAIN_ARTIFACTS.treasuries.files
	await ensureDirectory(domainDir)

	const treasuries = await fetchTreasuriesFromNetwork()
	await writeJsonFile(path.join(domainDir, files.full), treasuries)

	return { builtAt }
}
