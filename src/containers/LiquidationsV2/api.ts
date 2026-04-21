import { LIQUIDATIONS_SERVER_URL_V2 } from '~/constants'
import { fetchJson } from '~/utils/async'
import type {
	LiquidationsChainPageProps,
	LiquidationsOverviewPageProps,
	LiquidationsProtocolPageProps,
	RawAllLiquidationsResponse,
	RawProtocolChainLiquidationsResponse,
	RawProtocolLiquidationsResponse,
	RawProtocolsResponse,
	TokenLiquidationsSectionData
} from './api.types'

export async function fetchProtocolsList(): Promise<RawProtocolsResponse> {
	return fetchJson<RawProtocolsResponse>(`${LIQUIDATIONS_SERVER_URL_V2}/protocols?zz=14`)
}

export async function fetchAllLiquidations(): Promise<RawAllLiquidationsResponse> {
	return fetchJson<RawAllLiquidationsResponse>(`${LIQUIDATIONS_SERVER_URL_V2}/all?zz=14`)
}

export async function fetchProtocolLiquidations(protocol: string): Promise<RawProtocolLiquidationsResponse> {
	return fetchJson<RawProtocolLiquidationsResponse>(
		`${LIQUIDATIONS_SERVER_URL_V2}/protocol/${encodeURIComponent(protocol)}?zz=14`
	)
}

export async function fetchProtocolChainLiquidations(
	protocol: string,
	chain: string
): Promise<RawProtocolChainLiquidationsResponse> {
	return fetchJson<RawProtocolChainLiquidationsResponse>(
		`${LIQUIDATIONS_SERVER_URL_V2}/protocol/${encodeURIComponent(protocol)}/${encodeURIComponent(chain)}?zz=14`
	)
}

async function fetchLiquidationsClient<T>(
	url: string,
	fetchFn: ((url: string) => Promise<Response | null>) | typeof fetch = fetch
): Promise<T> {
	const res = await fetchFn(url)

	if (!res) {
		throw new Error('Authentication required')
	}

	if (!res.ok) {
		const errorData = await res.json().catch(() => null)
		throw new Error(errorData?.error ?? `Failed to fetch liquidations data: ${res.status}`)
	}

	return res.json()
}

export async function fetchLiquidationsOverviewClient(
	fetchFn: ((url: string) => Promise<Response | null>) | typeof fetch = fetch
): Promise<LiquidationsOverviewPageProps> {
	return fetchLiquidationsClient<LiquidationsOverviewPageProps>('/api/liquidations', fetchFn)
}

export async function fetchLiquidationsProtocolClient(
	protocol: string,
	fetchFn: ((url: string) => Promise<Response | null>) | typeof fetch = fetch
): Promise<LiquidationsProtocolPageProps> {
	return fetchLiquidationsClient<LiquidationsProtocolPageProps>(
		`/api/liquidations/${encodeURIComponent(protocol)}`,
		fetchFn
	)
}

export async function fetchLiquidationsChainClient(
	protocol: string,
	chain: string,
	fetchFn: ((url: string) => Promise<Response | null>) | typeof fetch = fetch
): Promise<LiquidationsChainPageProps> {
	return fetchLiquidationsClient<LiquidationsChainPageProps>(
		`/api/liquidations/${encodeURIComponent(protocol)}/${encodeURIComponent(chain)}`,
		fetchFn
	)
}

export async function fetchTokenLiquidationsClient(
	symbol: string,
	fetchFn: ((url: string) => Promise<Response | null>) | typeof fetch = fetch
): Promise<TokenLiquidationsSectionData> {
	return fetchLiquidationsClient<TokenLiquidationsSectionData>(
		`/api/token-liquidations/${encodeURIComponent(symbol.toUpperCase())}`,
		fetchFn
	)
}
