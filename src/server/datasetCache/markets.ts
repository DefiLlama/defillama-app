import type { ExchangeMarketsListResponse } from '~/containers/Cexs/markets.types'
import type { TokenMarketsListResponse } from '~/containers/Token/tokenMarkets.types'
import { getDatasetDomainDir, readDatasetManifest, readJsonFile } from './core'

function getMarketsDomainDir(): string {
	return getDatasetDomainDir('markets')
}

export async function fetchExchangeMarketsListFromCache(): Promise<ExchangeMarketsListResponse> {
	await readDatasetManifest()
	return readJsonFile<ExchangeMarketsListResponse>(`${getMarketsDomainDir()}/exchanges-list.json`)
}

export async function fetchTokenMarketsListFromCache(): Promise<TokenMarketsListResponse> {
	await readDatasetManifest()
	return readJsonFile<TokenMarketsListResponse>(`${getMarketsDomainDir()}/tokens-list.json`)
}
