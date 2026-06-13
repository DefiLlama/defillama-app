import path from 'node:path'
import { fetchExchangeMarketsListFromNetwork } from '~/containers/Cexs/api'
import { DATASET_DOMAIN_ARTIFACTS } from '~/server/datasetCache/artifacts'
import type { DatasetDomainBuildResult } from '~/server/datasetCache/buildTypes'
import { writeDatasetCacheJson as writeJsonFile } from '~/server/datasetCache/jsonCache'
import { ensureDirectory } from '~/utils/cacheDirectory'

const CEX_MARKETS_DOMAIN = 'cex-markets'

export async function buildCexMarketsDomain(rootDir: string): Promise<DatasetDomainBuildResult> {
	const builtAt = Date.now()
	const domainDir = path.join(rootDir, CEX_MARKETS_DOMAIN)
	const files = DATASET_DOMAIN_ARTIFACTS[CEX_MARKETS_DOMAIN].files
	await ensureDirectory(domainDir)

	const exchangesList = await fetchExchangeMarketsListFromNetwork()
	await writeJsonFile(path.join(domainDir, files.exchangesList), exchangesList)

	return { builtAt }
}
