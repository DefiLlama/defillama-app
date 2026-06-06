import type { HolderStatsMap } from '../queries/holderTypes'
import type { YieldBorrowTableRow, YieldLoopTableRow, YieldPoolTableRow } from '../Tables/types'
import type { LendBorrowPool, StablecoinInfoBySymbol, YieldPool } from '../types'
import { getYieldPoolTokens } from './poolFilters'

type VolatilityMap = Record<string, [number | null, number | null, number | null, number | null]>

interface MapPoolToRowOptions {
	stablecoinInfoBySymbol?: StablecoinInfoBySymbol
	volatility?: VolatilityMap
	holderStats?: HolderStatsMap
}

export function mapPoolToYieldTableRow(
	curr: YieldPool,
	{ stablecoinInfoBySymbol, volatility, holderStats }: MapPoolToRowOptions = {}
): YieldPoolTableRow {
	const poolTokens = getYieldPoolTokens(curr).array
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
		rewardTokensSymbols: (curr.rewardTokensSymbols ?? []) as string[],
		rewards: curr.rewardTokensNames ?? [],
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
	}
}

export function mapPoolToBorrowTableRow(curr: LendBorrowPool): YieldBorrowTableRow {
	return {
		pool: curr.symbol,
		configID: curr.pool,
		projectslug: curr.project,
		project: curr.projectName,
		airdrop: curr.airdrop,
		raiseValuation: curr.raiseValuation,
		chains: [curr.chain],
		apyBase: curr.apyBase,
		apyReward: curr.apyReward,
		apyBorrow: curr.apyBorrow,
		apyBaseBorrow: curr.apyBaseBorrow,
		apyRewardBorrow: curr.apyRewardBorrow,
		totalSupplyUsd: curr.totalSupplyUsd,
		totalBorrowUsd: curr.totalBorrowUsd,
		totalAvailableUsd: curr.totalAvailableUsd,
		url: curr.url,
		ltv: curr.ltv,
		rewardTokensSymbols: (curr.rewardTokensSymbols ?? []) as string[],
		rewards: curr.rewardTokensNames ?? [],
		tvl: curr.tvlUsd,
		apy: curr.apy,
		change1d: curr.apyPct1D ?? null,
		change7d: curr.apyPct7D ?? null,
		confidence: null,
		category: curr.category
	}
}

export function mapPoolToLoopTableRow(curr: LendBorrowPool): YieldLoopTableRow {
	return {
		...mapPoolToBorrowTableRow(curr),
		loopApy: curr.loopApy,
		boost: curr.boost,
		netSupplyApy: (curr.apyBase ?? 0) + (curr.apyReward ?? 0)
	}
}
