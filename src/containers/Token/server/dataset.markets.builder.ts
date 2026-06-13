import path from 'node:path'
import { fetchTokenMarketsListFromNetwork } from '~/containers/Token/api'
import { DATASET_DOMAIN_ARTIFACTS } from '~/server/datasetCache/artifacts'
import type { DatasetDomainBuildResult } from '~/server/datasetCache/buildTypes'
import { writeDatasetCacheJson as writeJsonFile } from '~/server/datasetCache/jsonCache'
import { ensureDirectory } from '~/utils/cacheDirectory'

const TOKEN_MARKETS_DOMAIN = 'token-markets'

export async function buildTokenMarketsDomain(rootDir: string): Promise<DatasetDomainBuildResult> {
	const builtAt = Date.now()
	const domainDir = path.join(rootDir, TOKEN_MARKETS_DOMAIN)
	const files = DATASET_DOMAIN_ARTIFACTS[TOKEN_MARKETS_DOMAIN].files
	await ensureDirectory(domainDir)

	const tokensList = await fetchTokenMarketsListFromNetwork()
	await writeJsonFile(path.join(domainDir, files.tokensList), tokensList)

	return { builtAt }
}
