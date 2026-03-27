const PROXY_URL = '/api/dashboard/fetch'

async function proxyFetch<T>(type: string, params: Record<string, any>, authToken: string): Promise<T> {
	const res = await fetch(PROXY_URL, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${authToken}`
		},
		body: JSON.stringify({ type, params })
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
