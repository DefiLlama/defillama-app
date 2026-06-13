import path from 'node:path'
import { fetchLiquidityTokensDatasetFromNetwork } from '~/api'
import { DATASET_DOMAIN_ARTIFACTS } from '~/server/datasetCache/artifacts'
import type { DatasetDomainBuildResult } from '~/server/datasetCache/buildTypes'
import { writeDatasetCacheJson as writeJsonFile } from '~/server/datasetCache/jsonCache'
import { ensureDirectory } from '~/utils/cacheDirectory'

export async function buildLiquidityDomain(rootDir: string): Promise<DatasetDomainBuildResult> {
	const builtAt = Date.now()
	const domainDir = path.join(rootDir, 'liquidity')
	const files = DATASET_DOMAIN_ARTIFACTS.liquidity.files
	await ensureDirectory(domainDir)

	const liquidity = await fetchLiquidityTokensDatasetFromNetwork()
	await writeJsonFile(path.join(domainDir, files.full), liquidity)

	return { builtAt }
}
