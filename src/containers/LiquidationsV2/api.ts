import { LIQUIDATIONS_SERVER_URL_V2 } from '~/constants'
import { getAliasGroup } from '~/constants/tokenAliases'
import { fetchJson } from '~/utils/async'
import type {
	LiquidationsChainPageProps,
	LiquidationsOverviewPageProps,
	LiquidationsProtocolPageProps,
	OverviewChainRow,
	OverviewProtocolRow,
	RawAllLiquidationsResponse,
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

function mergeProtocolRows(rows: OverviewProtocolRow[]): OverviewProtocolRow[] {
	const byId = new Map<string, OverviewProtocolRow>()
	for (const row of rows) {
		const existing = byId.get(row.id)
		if (!existing) {
			byId.set(row.id, { ...row })
			continue
		}
		existing.positionCount += row.positionCount
		existing.totalCollateralUsd += row.totalCollateralUsd
		existing.collateralCount += row.collateralCount
		existing.chainCount = Math.max(existing.chainCount, row.chainCount)
	}
	return Array.from(byId.values())
}

function mergeChainRows(rows: OverviewChainRow[]): OverviewChainRow[] {
	const byId = new Map<string, OverviewChainRow>()
	for (const row of rows) {
		const existing = byId.get(row.id)
		if (!existing) {
			byId.set(row.id, { ...row })
			continue
		}
		existing.positionCount += row.positionCount
		existing.totalCollateralUsd += row.totalCollateralUsd
		existing.collateralCount += row.collateralCount
		existing.protocolCount = Math.max(existing.protocolCount, row.protocolCount)
	}
	return Array.from(byId.values())
}

function mergeTokenLiquidations(
	parts: TokenLiquidationsSectionData[],
	displaySymbol: string
): TokenLiquidationsSectionData {
	const protocolRows = mergeProtocolRows(parts.flatMap((part) => part.protocolRows))
	const chainRows = mergeChainRows(parts.flatMap((part) => part.chainRows))
	const tokens = parts
		.flatMap((part) => part.distributionChart.tokens)
		.sort((a, b) => (b.totalUsd ?? 0) - (a.totalUsd ?? 0))
	const positionCount = protocolRows.reduce((acc, row) => acc + row.positionCount, 0)
	const totalCollateralUsd = protocolRows.reduce((acc, row) => acc + row.totalCollateralUsd, 0)
	const timestamp = parts.reduce((acc, part) => Math.max(acc, part.timestamp), 0)

	return {
		tokenSymbol: displaySymbol,
		timestamp,
		positionCount,
		protocolCount: protocolRows.length,
		chainCount: chainRows.length,
		totalCollateralUsd,
		distributionChart: { tokens },
		protocolRows,
		chainRows
	}
}

export async function fetchTokenLiquidationsForAliases(
	symbol: string,
	fetchFn: ((url: string) => Promise<Response | null>) | typeof fetch = fetch
): Promise<TokenLiquidationsSectionData | null> {
	const aliases = getAliasGroup(symbol)
	const settled = await Promise.allSettled(aliases.map((alias) => fetchTokenLiquidationsClient(alias, fetchFn)))
	const parts = settled
		.filter((result): result is PromiseFulfilledResult<TokenLiquidationsSectionData> => result.status === 'fulfilled')
		.map((result) => result.value)

	if (parts.length === 0) return null
	if (parts.length === 1) return parts[0]

	return mergeTokenLiquidations(parts, symbol.toUpperCase())
}
