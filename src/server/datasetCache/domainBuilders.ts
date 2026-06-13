import path from 'node:path'
import { fetchExchangeMarketsListFromNetwork } from '~/containers/Cexs/api'
import { fetchTokenMarketsListFromNetwork } from '~/containers/Token/api'
import { ensureDirectory } from '~/utils/cacheDirectory'
import { DATASET_DOMAIN_ARTIFACTS, type DatasetDomain } from './artifacts'
import type { DatasetDomainBuildResult } from './buildTypes'
import { writeDatasetCacheJson as writeJsonFile } from './jsonCache'
export { buildLiquidationsDomain } from '~/containers/LiquidationsV2/server/dataset.builder'
export { buildRaisesDomain } from '~/containers/Raises/server/dataset.builder'
export { buildLiquidityDomain } from '~/containers/Token/server/dataset.liquidity.builder'
export { buildRiskDomain } from '~/containers/Token/server/dataset.risk.builder'
export { buildTokenRightsDomain } from '~/containers/TokenRights/server/dataset.builder'
export { buildTreasuriesDomain } from '~/containers/Treasuries/server/dataset.builder'
export { buildYieldsDomain } from '~/containers/Yields/server/dataset.builder'

function getDomainDir(rootDir: string, domain: DatasetDomain): string {
	return path.join(rootDir, domain)
}

// `markets` artifacts span two owners (exchanges list -> Cexs, tokens list -> Token),
// so the builder stays here until the domain is split.
export async function buildMarketsDomain(rootDir: string): Promise<DatasetDomainBuildResult> {
	const builtAt = Date.now()
	const domainDir = getDomainDir(rootDir, 'markets')
	const files = DATASET_DOMAIN_ARTIFACTS.markets.files
	await ensureDirectory(domainDir)

	const [tokensList, exchangesList] = await Promise.all([
		fetchTokenMarketsListFromNetwork(),
		fetchExchangeMarketsListFromNetwork()
	])

	await Promise.all([
		writeJsonFile(path.join(domainDir, files.tokensList), tokensList),
		writeJsonFile(path.join(domainDir, files.exchangesList), exchangesList)
	])

	return { builtAt }
}
