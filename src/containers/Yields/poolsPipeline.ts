import { filterYieldPools, type YieldPoolFilterState, extractYieldPoolTokens } from './domain/poolFilters'
import { mapPoolToYieldTableRow } from './domain/poolRows'
import { matchesYieldPoolToken } from './domain/tokenFilter'
import type { HolderStatsMap } from './queries/holderTypes'
import type { IYieldTableRow } from './Tables/types'
import type { StablecoinInfoBySymbol, YieldPool, YieldTokenCategories, YieldView } from './types'

type VolatilityMap = Record<string, [number | null, number | null, number | null, number | null]>

interface BuildPoolRowsOptions {
	pools: YieldPool[]
	view: YieldView
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
	view,
	filters,
	usdPeggedSymbols = [],
	tokenCategories,
	stablecoinInfoBySymbol,
	volatility,
	holderStats
}: BuildPoolRowsOptions): IYieldTableRow[] {
	const filteredPools = filterYieldPools({ pools, view, filters, usdPeggedSymbols, tokenCategories })
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
	const filteredRows: IYieldTableRow[] = []
	const shouldFilterChains = selectedChains.length > 0 && selectedChains.length < chainList.length
	const chainSet = shouldFilterChains ? new Set(selectedChains) : null
	const shouldIncludeTokens = includeTokens.length > 0 && includeTokens[0] !== 'All'

	rowLoop: for (const row of rows) {
		if (chainSet && !chainSet.has(row.chains[0])) continue
		if (row.tvl == null && (minTvl != null || maxTvl != null)) continue
		if (minTvl != null && row.tvl < minTvl) continue
		if (maxTvl != null && row.tvl > maxTvl) continue
		if (row.apy == null && (minApy != null || maxApy != null)) continue
		if (minApy != null && row.apy <= minApy) continue
		if (maxApy != null && row.apy >= maxApy) continue

		if (shouldIncludeTokens) {
			let hasIncludedToken = false
			for (const token of includeTokens) {
				if (matchesYieldPoolToken(row.pool, token)) {
					hasIncludedToken = true
					break
				}
			}
			if (!hasIncludedToken) continue
		}

		for (const token of excludeTokens) {
			if (matchesYieldPoolToken(row.pool, token)) continue rowLoop
		}

		filteredRows.push(row)
	}
	return filteredRows
}

export function buildPoolsTrackingStats(rows: IYieldTableRow[]) {
	let totalApy = 0
	let poolsWithApy = 0
	for (const row of rows) {
		if (row.apy == null || row.apy === 0) continue
		totalApy += row.apy
		poolsWithApy++
	}

	return {
		noOfPoolsTracked: rows.length,
		averageAPY: poolsWithApy > 0 ? totalApy / poolsWithApy : null
	}
}

export function getPoolRowChains(rows: IYieldTableRow[]) {
	const chains = new Set<string>()
	for (const row of rows) {
		if (row.chains[0]) chains.add(row.chains[0])
	}
	return Array.from(chains).sort()
}

export function getPoolRowTokens(rows: IYieldTableRow[]) {
	const tokens = new Set<string>()
	for (const row of rows) {
		for (const token of extractYieldPoolTokens(row.pool)) {
			tokens.add(token)
		}
	}
	const sortedTokens = Array.from(tokens).sort()
	for (let i = 0; i < sortedTokens.length; i++) {
		sortedTokens[i] = sortedTokens[i].toUpperCase()
	}
	return sortedTokens
}
