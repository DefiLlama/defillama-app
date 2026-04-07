const PROXY_URL = '/api/dashboard/fetch'

async function proxyFetch<T>(type: string, params: Record<string, any>, authToken: string): Promise<T> {
	const url = `${PROXY_URL}?type=${encodeURIComponent(type)}&params=${encodeURIComponent(JSON.stringify(params))}`
	const res = await fetch(url, {
		headers: {
			Authorization: `Bearer ${authToken}`
		}
	})
	if (!res.ok) {
		throw new Error(`Proxy fetch failed: ${res.status}`)
	}
	const json = await res.json()
	return json.data as T
}

export async function fetchChartViaProxy(
	chart: {
		type: string
		protocol?: string
		chain?: string
		geckoId?: string | null
		dataType?: string
	},
	authToken: string
): Promise<[number, number][]> {
	return proxyFetch<[number, number][]>('chart', { chart }, authToken)
}

export async function fetchStablecoinsViaProxy(chain: string, authToken: string) {
	return proxyFetch<any>('stablecoins', { chain }, authToken)
}

export async function fetchAdvancedTvlBasicViaProxy(protocol: string, authToken: string): Promise<[number, number][]> {
	return proxyFetch<[number, number][]>('advancedTvlBasic', { protocol }, authToken)
}

export async function fetchProtocolFullViaProxy(protocol: string, authToken: string): Promise<any> {
	return proxyFetch<any>('protocolFull', { protocol }, authToken)
}

export async function fetchYieldsViaProxy(poolConfigId: string, authToken: string): Promise<any> {
	return proxyFetch<any>('yields', { poolConfigId }, authToken)
}

export async function fetchYieldsLendBorrowViaProxy(poolConfigId: string, authToken: string): Promise<any> {
	return proxyFetch<any>('yieldsLendBorrow', { poolConfigId }, authToken)
}

export async function fetchTokenUsageViaProxy(symbol: string, authToken: string): Promise<any> {
	return proxyFetch<any>('tokenUsage', { symbol }, authToken)
}

export async function fetchStablecoinsListViaProxy(authToken: string): Promise<any> {
	return proxyFetch<any>('stablecoinsList', {}, authToken)
}

export async function fetchStablecoinAssetViaProxy(slug: string, authToken: string): Promise<any> {
	return proxyFetch<any>('stablecoinAsset', { slug }, authToken)
}

export async function fetchRWABreakdownViaProxy(
	breakdown: string,
	metric: string,
	authToken: string,
	chain?: string
): Promise<any> {
	return proxyFetch<any>('rwaBreakdown', { breakdown, metric, chain }, authToken)
}

export async function fetchRWAAssetChartViaProxy(assetId: string, authToken: string): Promise<any> {
	return proxyFetch<any>('rwaAssetChart', { assetId }, authToken)
}

export async function fetchRWAAssetsListViaProxy(authToken: string): Promise<any> {
	return proxyFetch<any>('rwaAssetsList', {}, authToken)
}

export async function fetchRWAStatsViaProxy(authToken: string): Promise<any> {
	return proxyFetch<any>('rwaStats', {}, authToken)
}

export async function fetchEquitiesCompaniesViaProxy(authToken: string): Promise<any> {
	return proxyFetch<any>('equitiesCompanies', {}, authToken)
}

export async function fetchEquitiesStatementsViaProxy(ticker: string, authToken: string): Promise<any> {
	return proxyFetch<any>('equitiesStatements', { ticker }, authToken)
}

export async function fetchEquitiesFilingsViaProxy(ticker: string, authToken: string): Promise<any> {
	return proxyFetch<any>('equitiesFilings', { ticker }, authToken)
}
