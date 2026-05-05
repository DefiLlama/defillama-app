import type { HolderStatsMap } from './queries/holderTypes'
import type { YieldsData } from './queries/index'
import type { IYieldTableRow } from './Tables/types'
import { matchesYieldPoolToken } from './tokenFilter'
import { extractPoolTokens, normalizeToken, toFilterPool } from './utils'

type NormalizedYieldPool = YieldsData['props']['pools'][number]
type StablecoinInfoBySymbol = Record<string, { price: number | null; pegDeviation: number | null }>
type VolatilityMap = Record<string, [number | null, number | null, number | null, number | null]>

interface PoolsPipelineFilterState {
	selectedProjects: string[]
	selectedChains: string[]
	selectedAttributes: string[]
	includeTokens: string[]
	excludeTokens: string[]
	exactTokens?: string[]
	selectedCategories: string[]
	pairTokens?: string[]
	minTvl: number | null
	maxTvl: number | null
	minApy: number | null
	maxApy: number | null
}

interface BuildPoolRowsOptions {
	pools: NormalizedYieldPool[]
	pathname: string
	filters: PoolsPipelineFilterState
	usdPeggedSymbols?: string[]
	tokenCategories?: Record<string, { addresses: string[]; symbols: string[]; label: string; filterKey: string }>
	stablecoinInfoBySymbol?: StablecoinInfoBySymbol
	volatility?: VolatilityMap
	holderStats?: HolderStatsMap
}

interface MapPoolToRowOptions {
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

export function mapPoolToYieldTableRow(
	curr: NormalizedYieldPool,
	{ stablecoinInfoBySymbol, volatility, holderStats }: MapPoolToRowOptions = {}
): IYieldTableRow {
	const poolTokens = curr.symbol ? extractPoolTokens(curr.symbol) : []
	let pegInfo: { price: number | null; pegDeviation: number | null } | null = null
	let maxAbsPegDeviation = -1

	if (stablecoinInfoBySymbol) {
		for (const token of poolTokens) {
			const info = stablecoinInfoBySymbol[token]
			if (!info) continue

			const absoluteDeviation = info.pegDeviation != null ? Math.abs(info.pegDeviation) : -1
			if (absoluteDeviation > maxAbsPegDeviation) {
				maxAbsPegDeviation = absoluteDeviation
				pegInfo = info
			}
		}
	}

	return {
		id: curr.pool,
		rewardMeta: curr.rewardMeta ?? '',
		symbol: curr.symbol ?? '',
		pool: curr.symbol ?? '',
		configID: curr.pool,
		projectslug: curr.project,
		project: curr.projectName,
		airdrop: curr.airdrop,
		raiseValuation: curr.raiseValuation,
		chains: [curr.chain],
		tvl: curr.tvlUsd,
		apy: curr.apy,
		apyBase: curr.apyBase,
		apyReward: curr.apyReward,
		rewardTokensSymbols: curr.rewardTokensSymbols,
		rewards: curr.rewardTokensNames,
		change1d: curr.apyPct1D,
		change7d: curr.apyPct7D,
		outlook: curr.apy >= 0.005 ? (curr.predictions?.predictedClass ?? null) : null,
		confidence: curr.apy >= 0.005 ? (curr.predictions?.binnedConfidence ?? null) : null,
		url: curr.url,
		category: curr.category,
		il7d: curr.il7d,
		apyBase7d: curr.apyBase7d,
		apyNet7d: curr.apyNet7d,
		apyMean30d: curr.apyMean30d,
		volumeUsd1d: curr.volumeUsd1d,
		volumeUsd7d: curr.volumeUsd7d,
		apyBaseInception: curr.apyBaseInception,
		apyIncludingLsdApy: curr.apyIncludingLsdApy,
		apyBaseIncludingLsdApy: curr.apyBaseIncludingLsdApy,
		apyBaseBorrow: curr.apyBaseBorrow,
		apyRewardBorrow: curr.apyRewardBorrow,
		apyBorrow: curr.apyBorrow,
		totalSupplyUsd: curr.totalSupplyUsd,
		totalBorrowUsd: curr.totalBorrowUsd,
		totalAvailableUsd: curr.totalAvailableUsd,
		ltv: curr.ltv,
		lsdTokenOnly: curr.lsdTokenOnly,
		poolMeta: curr.poolMeta,
		apyMedian30d: volatility?.[curr.pool]?.[1] ?? null,
		apyStd30d: volatility?.[curr.pool]?.[2] ?? null,
		cv30d: volatility?.[curr.pool]?.[3] ?? null,
		pegDeviation: pegInfo?.pegDeviation ?? null,
		pegPrice: pegInfo?.price ?? null,
		holderCount: holderStats?.[curr.pool]?.holderCount ?? null,
		avgPositionUsd: holderStats?.[curr.pool]?.avgPositionUsd ?? null,
		top10Pct: holderStats?.[curr.pool]?.top10Pct ?? null,
		holderChange7d: holderStats?.[curr.pool]?.holderChange7d ?? null,
		holderChange30d: holderStats?.[curr.pool]?.holderChange30d ?? null,
		apyChart30d: curr.pool ? `https://yield-charts.llama.fi/yield-chart/${curr.pool}` : null
	} as unknown as IYieldTableRow
}

export function buildYieldTableRowsWithBorrowData(
	yieldPools: NormalizedYieldPool[],
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
	filters,
	usdPeggedSymbols = [],
	tokenCategories,
	stablecoinInfoBySymbol,
	volatility,
	holderStats
}: BuildPoolRowsOptions): IYieldTableRow[] {
	const selectedProjectsSet = new Set(filters.selectedProjects)
	const selectedChainsSet = new Set(filters.selectedChains)
	const selectedCategoriesSet = new Set(filters.selectedCategories)
	const includeTokens = filters.includeTokens.map((token) => normalizeToken(token))
	const excludeTokensSet = new Set(filters.excludeTokens.map((token) => normalizeToken(token)))
	const exactTokens = (filters.exactTokens ?? []).map((token) => normalizeToken(token))
	const pairTokens = (filters.pairTokens ?? []).map((token) => normalizeToken(token))

	return pools.reduce<IYieldTableRow[]>((accumulator, curr) => {
		if (
			!toFilterPool({
				curr,
				pathname,
				selectedProjectsSet,
				selectedChainsSet,
				selectedAttributes: filters.selectedAttributes,
				includeTokens,
				excludeTokensSet,
				exactTokens,
				selectedCategoriesSet,
				minTvl: filters.minTvl,
				maxTvl: filters.maxTvl,
				minApy: filters.minApy,
				maxApy: filters.maxApy,
				pairTokens,
				usdPeggedSymbols,
				tokenCategories
			})
		) {
			return accumulator
		}

		accumulator.push(mapPoolToYieldTableRow(curr, { stablecoinInfoBySymbol, volatility, holderStats }))
		return accumulator
	}, [])
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
	// Match the page-level pool filter semantics: APY range bounds are exclusive.
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
	return [...new Set(rows.flatMap((row) => extractPoolTokens(row.pool)))].sort().map((token) => token.toUpperCase())
}
