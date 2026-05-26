import { filterYieldPools, type YieldPoolFilterState, extractYieldPoolTokens } from './domain/poolFilters'
import { mapPoolToYieldTableRow } from './domain/poolRows'
import { matchesYieldPoolToken } from './domain/tokenFilter'
import { getYieldViewFromPathname } from './domain/views'
import type { HolderStatsMap } from './queries/holderTypes'
import type { IYieldTableRow } from './Tables/types'
import type { StablecoinInfoBySymbol, YieldPool, YieldTokenCategories, YieldView } from './types'

type VolatilityMap = Record<string, [number | null, number | null, number | null, number | null]>

interface BuildPoolRowsOptions {
	pools: YieldPool[]
	pathname?: string
	view?: YieldView
	filters: YieldPoolFilterState
	usdPeggedSymbols?: string[]
	tokenCategories?: YieldTokenCategories
	stablecoinInfoBySymbol?: StablecoinInfoBySymbol
	volatility?: VolatilityMap
	holderStats?: HolderStatsMap
}

interface LendBorrowPoolSupplement {
	pool: string
	apyBaseBorrow?: number | null
	apyRewardBorrow?: number | null
	apyBorrow?: number | null
	totalSupplyUsd?: number | null
	totalBorrowUsd?: number | null
	totalAvailableUsd?: number | null
	ltv?: number | null
}

export { mapPoolToYieldTableRow } from './domain/poolRows'

export function buildYieldTableRowsWithBorrowData(
	yieldPools: YieldPool[],
	lendBorrowPools: LendBorrowPoolSupplement[]
): IYieldTableRow[] {
	const lendBorrowMap = new Map<string, LendBorrowPoolSupplement>()
	for (const entry of lendBorrowPools) {
		lendBorrowMap.set(entry.pool, entry)
	}

	const rows: IYieldTableRow[] = []
	for (const pool of yieldPools) {
		const baseRow = mapPoolToYieldTableRow(pool)
		const lendBorrowEntry = lendBorrowMap.get(pool.pool)

		rows.push({
			...baseRow,
			apyBaseBorrow: lendBorrowEntry?.apyBaseBorrow ?? baseRow.apyBaseBorrow ?? null,
			apyRewardBorrow: lendBorrowEntry?.apyRewardBorrow ?? baseRow.apyRewardBorrow ?? null,
			apyBorrow: lendBorrowEntry?.apyBorrow ?? baseRow.apyBorrow ?? null,
			totalSupplyUsd: lendBorrowEntry?.totalSupplyUsd ?? baseRow.totalSupplyUsd ?? null,
			totalBorrowUsd: lendBorrowEntry?.totalBorrowUsd ?? baseRow.totalBorrowUsd ?? null,
			totalAvailableUsd: lendBorrowEntry?.totalAvailableUsd ?? baseRow.totalAvailableUsd ?? null,
			ltv: lendBorrowEntry?.ltv ?? baseRow.ltv ?? null
		})
	}

	return rows
}

export function buildPoolsTableRows({
	pools,
	pathname,
	view,
	filters,
	usdPeggedSymbols = [],
	tokenCategories,
	stablecoinInfoBySymbol,
	volatility,
	holderStats
}: BuildPoolRowsOptions): IYieldTableRow[] {
	const resolvedView = view ?? getYieldViewFromPathname(pathname ?? '')
	const filteredPools = filterYieldPools({ pools, view: resolvedView, filters, usdPeggedSymbols, tokenCategories })
	const rows: IYieldTableRow[] = []

	for (const pool of filteredPools) {
		rows.push(mapPoolToYieldTableRow(pool, { stablecoinInfoBySymbol, volatility, holderStats }))
	}

	return rows
}

export function filterPoolTableRows(
	rows: IYieldTableRow[],
	{
		selectedChains,
		chainList = [],
		includeTokens,
		excludeTokens,
		minTvl,
		maxTvl,
		minApy,
		maxApy
	}: {
		selectedChains: string[]
		chainList?: string[]
		includeTokens: string[]
		excludeTokens: string[]
		minTvl: number | null
		maxTvl: number | null
		minApy: number | null
		maxApy: number | null
	}
) {
	let filteredRows = rows

	if (selectedChains.length > 0 && selectedChains.length < chainList.length) {
		const chainSet = new Set(selectedChains)
		filteredRows = filteredRows.filter((row) => chainSet.has(row.chains[0]))
	}

	if (includeTokens.length > 0 && includeTokens[0] !== 'All') {
		filteredRows = filteredRows.filter((row) => includeTokens.some((token) => matchesYieldPoolToken(row.pool, token)))
	}

	if (excludeTokens.length > 0) {
		filteredRows = filteredRows.filter((row) => excludeTokens.every((token) => !matchesYieldPoolToken(row.pool, token)))
	}

	if (minTvl != null) {
		filteredRows = filteredRows.filter((row) => row.tvl != null && row.tvl >= minTvl)
	}
	if (maxTvl != null) {
		filteredRows = filteredRows.filter((row) => row.tvl != null && row.tvl <= maxTvl)
	}
	if (minApy != null) {
		filteredRows = filteredRows.filter((row) => row.apy != null && row.apy > minApy)
	}
	if (maxApy != null) {
		filteredRows = filteredRows.filter((row) => row.apy != null && row.apy < maxApy)
	}

	return filteredRows
}

export function buildPoolsTrackingStats(rows: IYieldTableRow[]) {
	const poolsWithApy = rows.filter((row): row is IYieldTableRow & { apy: number } => row.apy != null && row.apy !== 0)

	return {
		noOfPoolsTracked: rows.length,
		averageAPY:
			poolsWithApy.length > 0 ? poolsWithApy.reduce((total, row) => total + row.apy, 0) / poolsWithApy.length : null
	}
}

export function getPoolRowChains(rows: IYieldTableRow[]) {
	return [...new Set(rows.map((row) => row.chains[0]).filter(Boolean))].sort()
}

export function getPoolRowTokens(rows: IYieldTableRow[]) {
	return [...new Set(rows.flatMap((row) => extractYieldPoolTokens(row.pool)))]
		.sort()
		.map((token) => token.toUpperCase())
}
