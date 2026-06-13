import path from 'node:path'
import { DATASET_DOMAIN_ARTIFACTS } from '~/server/datasetCache/artifacts'
import type { DatasetDomainBuildResult } from '~/server/datasetCache/buildTypes'
import { writeDatasetCacheJson as writeJsonFile } from '~/server/datasetCache/jsonCache'
import { ensureDirectory } from '~/utils/cacheDirectory'
import { buildCexMarketsSlugIndex, buildTokenMarketsSymbolIndex } from './dataset.index'
import { fetchExchangeMarketsListFromNetwork, fetchTokenMarketsListFromNetwork } from './upstream'

const MARKETS_DOMAIN = 'markets'

export async function buildMarketsDomain(rootDir: string): Promise<DatasetDomainBuildResult> {
	const builtAt = Date.now()
	const domainDir = path.join(rootDir, MARKETS_DOMAIN)
	const files = DATASET_DOMAIN_ARTIFACTS[MARKETS_DOMAIN].files
	await ensureDirectory(domainDir)

	const [tokensList, exchangesList] = await Promise.all([
		fetchTokenMarketsListFromNetwork(),
		fetchExchangeMarketsListFromNetwork()
	])

	await Promise.all([
		writeJsonFile(path.join(domainDir, files.tokensList), tokensList),
		writeJsonFile(path.join(domainDir, files.exchangesList), exchangesList),
		writeJsonFile(path.join(domainDir, files.tokenSymbols), buildTokenMarketsSymbolIndex(tokensList)),
		writeJsonFile(path.join(domainDir, files.cexByDefillamaSlug), buildCexMarketsSlugIndex(exchangesList))
	])

	return { builtAt }
}
