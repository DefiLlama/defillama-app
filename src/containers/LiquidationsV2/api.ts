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
	LiquidationsDistributionChartBreakdownKey,
	LiquidationsDistributionChartSeries,
	LiquidationsDistributionChartToken,
	LiquidationsDistributionChartView,
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

const LIQUIDATIONS_CHART_BREAKDOWN_KEYS: LiquidationsDistributionChartBreakdownKey[] = ['total', 'protocol', 'chain']

function mergeChartViews(views: LiquidationsDistributionChartView[]): LiquidationsDistributionChartView {
	const binSet = new Set<number>()
	for (const view of views) {
		for (const bin of view.bins) {
			binSet.add(bin)
		}
	}

	const bins = Array.from(binSet).toSorted((a, b) => a - b)
	const binIndexes = new Map<number, number>()
	for (let index = 0; index < bins.length; index += 1) {
		binIndexes.set(bins[index], index)
	}

	const seriesByKey = new Map<string, LiquidationsDistributionChartSeries>()
	for (const view of views) {
		for (let binIndex = 0; binIndex < view.bins.length; binIndex += 1) {
			const mergedBinIndex = binIndexes.get(view.bins[binIndex])
			if (mergedBinIndex == null) continue

			for (const source of view.series) {
				let series = seriesByKey.get(source.key)
				if (!series) {
					series = {
						key: source.key,
						label: source.label,
						usd: new Array(bins.length).fill(0),
						amount: new Array(bins.length).fill(0),
						totalUsd: 0
					}
					seriesByKey.set(source.key, series)
				}
				series.usd[mergedBinIndex] += source.usd[binIndex] ?? 0
				series.amount[mergedBinIndex] += source.amount[binIndex] ?? 0
			}
		}

		for (const source of view.series) {
			const series = seriesByKey.get(source.key)
			if (series) series.totalUsd += source.totalUsd
		}
	}

	return {
		bins,
		series: Array.from(seriesByKey.values()).toSorted((a, b) => {
			if (b.totalUsd !== a.totalUsd) return b.totalUsd - a.totalUsd
			return a.label.localeCompare(b.label)
		})
	}
}

function mergeChartTokens(tokens: LiquidationsDistributionChartToken[]): LiquidationsDistributionChartToken[] {
	const byKey = new Map<string, LiquidationsDistributionChartToken[]>()
	for (const token of tokens) {
		const entries = byKey.get(token.key)
		if (entries) {
			entries.push(token)
		} else {
			byKey.set(token.key, [token])
		}
	}

	const merged: LiquidationsDistributionChartToken[] = []
	for (const tokensForKey of byKey.values()) {
		const first = tokensForKey[0]
		if (!first) continue

		const breakdowns = {} as LiquidationsDistributionChartToken['breakdowns']
		for (const key of LIQUIDATIONS_CHART_BREAKDOWN_KEYS) {
			breakdowns[key] = mergeChartViews(tokensForKey.map((token) => token.breakdowns[key]))
		}

		let totalUsd = 0
		for (const token of tokensForKey) {
			totalUsd += token.totalUsd
		}

		merged.push({
			key: first.key,
			label: first.label,
			totalUsd,
			breakdowns
		})
	}

	return merged.toSorted((a, b) => {
		if (b.totalUsd !== a.totalUsd) return b.totalUsd - a.totalUsd
		return a.label.localeCompare(b.label)
	})
}

function mergeTokenLiquidations(
	parts: TokenLiquidationsSectionData[],
	displaySymbol: string
): TokenLiquidationsSectionData {
	const protocolRows = mergeProtocolRows(parts.flatMap((part) => part.protocolRows))
	const chainRows = mergeChainRows(parts.flatMap((part) => part.chainRows))
	const tokens = mergeChartTokens(parts.flatMap((part) => part.distributionChart.tokens))
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
	const displaySymbol = (aliases[0] ?? symbol).toUpperCase()
	const settled = await Promise.allSettled(aliases.map((alias) => fetchTokenLiquidationsClient(alias, fetchFn)))
	const parts = settled
		.filter((result): result is PromiseFulfilledResult<TokenLiquidationsSectionData> => result.status === 'fulfilled')
		.map((result) => result.value)

	if (parts.length === 0) {
		const reasons: string[] = []
		for (const result of settled) {
			if (result.status === 'rejected') {
				reasons.push(result.reason instanceof Error ? result.reason.message : String(result.reason))
			}
		}
		throw new Error(`Failed to fetch token liquidations for ${displaySymbol}: ${reasons.join('; ')}`)
	}
	if (parts.length === 1) return { ...parts[0], tokenSymbol: displaySymbol }

	return mergeTokenLiquidations(parts, displaySymbol)
}
