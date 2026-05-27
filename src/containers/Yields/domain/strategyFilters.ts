import type { RawYieldPerpMarket } from '../api.types'
import { attributeOptionsMap } from '../Filters/Attributes'
import type { LendBorrowPool, YieldPool } from '../types'
import {
	buildLendBorrowPairs,
	excludedOptimizerProjects,
	isStableToken,
	type LendBorrowPairPool,
	matchesLendBorrowToken,
	removeLendBorrowMetaTag
} from './lendBorrowPairs'
import { calculateLoopAPY } from './loopApy'
import { applyCustomLtvToMax, isValidOptimizerCustomLtv, isValidStrategyCustomLtv, resolveOptimizerLtv } from './ltv'

export const findOptimizerPools = ({ pools, tokenToLend, tokenToBorrow, cdpRoutes }) => {
	if (!tokenToLend && !tokenToBorrow) return []
	const optimizerCdpRoutes = cdpRoutes.filter((pool) => !excludedOptimizerProjects.has(pool.project))
	const lendBorrowPairs = buildLendBorrowPairs({ pools, tokenToLend, tokenToBorrow, mode: 'optimizer' })

	const cdpPairs =
		tokenToLend && tokenToBorrow
			? optimizerCdpRoutes.filter(
					(p) =>
						(isStableToken(tokenToLend) ? p.stablecoin : matchesLendBorrowToken(p.symbol, tokenToLend)) &&
						(isStableToken(tokenToBorrow) ? true : matchesLendBorrowToken(p.borrow.symbol, tokenToBorrow))
				)
			: []

	return lendBorrowPairs.concat(cdpPairs)
}

export interface YieldStrategyCandidate extends LendBorrowPairPool {
	farmPool: string
	farmSymbol: string
	farmChain: string[]
	farmProjectName: string
	farmProject: string
	farmTvlUsd: number
	farmApy: number | null
	farmApyBase?: number | null
	farmApyReward?: number | null
	strategy?: string
	totalApy?: number | null
	delta?: number | null
	strikeTvl?: boolean
}

export interface YieldLongShortStrategyCandidate extends YieldPool {
	strategy?: string
	strategyAPY: number
	fr8hCurrent: string
	fundingRate7dAverage: string
	symbolPerp: string
	openInterest: number
	tvlUsd: number
	marketplace: string
	afr: number
	afr7d: number
	afr30d: number
	indexPrice: number
	chains: string[]
	strikeTvl?: boolean
}

export const findStrategyPools = ({
	pools,
	tokenToLend,
	tokenToBorrow,
	allPools,
	cdpRoutes,
	customLTV
}: {
	pools: LendBorrowPool[]
	tokenToLend?: string | null
	tokenToBorrow?: string | null
	allPools: YieldPool[]
	cdpRoutes: Array<LendBorrowPool & { chains: string[]; borrow: LendBorrowPool }>
	customLTV?: number | null
}): YieldStrategyCandidate[] => {
	const loopPools = calculateLoopAPY(pools, 10, customLTV)
	let lendBorrowPairs = buildLendBorrowPairs({ pools, tokenToLend, tokenToBorrow, mode: 'strategy' })

	let cdpPairs = []
	if (tokenToLend) {
		cdpPairs = cdpRoutes.filter((p) => matchesLendBorrowToken(p.symbol, tokenToLend))
	}
	if (tokenToBorrow) {
		cdpPairs = cdpPairs.filter((p) => matchesLendBorrowToken(p.borrow.symbol, tokenToBorrow))
	}
	lendBorrowPairs = lendBorrowPairs.concat(cdpPairs)

	let finalPools: YieldStrategyCandidate[] = []
	if (tokenToBorrow) {
		const farmPools = allPools.filter((i) =>
			isStableToken(tokenToBorrow) ? i.stablecoin : matchesLendBorrowToken(i.symbol, tokenToBorrow)
		)
		for (const p of lendBorrowPairs) {
			for (const i of farmPools) {
				if (p.chain !== i.chain) continue
				if (
					isStableToken(tokenToBorrow)
						? !i.stablecoin || !matchesLendBorrowToken(i.symbol, p.borrow.symbol)
						: !matchesLendBorrowToken(i.symbol, tokenToBorrow)
				)
					continue

				finalPools.push({
					...p,
					farmPool: i.pool,
					farmSymbol: i.symbol,
					farmChain: [i.chain],
					farmProjectName: i.projectName,
					farmProject: i.project,
					farmTvlUsd: i.tvlUsd,
					farmApy: i.apy,
					farmApyBase: i.apyBase,
					farmApyReward: i.apyReward
				})
			}
		}
	} else {
		for (const p of lendBorrowPairs) {
			for (const i of allPools) {
				if (p.chain !== i.chain) continue
				if (!matchesLendBorrowToken(i.symbol, p.borrow.symbol) && !matchesLendBorrowToken(p.borrow.symbol, i.symbol))
					continue

				finalPools.push({
					...p,
					farmPool: i.pool,
					farmSymbol: i.symbol,
					farmChain: [i.chain],
					farmProjectName: i.projectName,
					farmProject: i.project,
					farmTvlUsd: i.tvlUsd,
					farmApy: i.apy,
					farmApyBase: i.apyBase,
					farmApyReward: i.apyReward
				})
			}
		}
	}

	const loopPoolsFiltered: YieldStrategyCandidate[] =
		tokenToBorrow !== tokenToLend && tokenToBorrow?.length > 0
			? []
			: loopPools
					.filter((p) => matchesLendBorrowToken(p.symbol, tokenToLend))
					.map((p) => ({
						...p,
						farmPool: p.pool,
						borrow: p,
						chains: [p.chain],
						farmSymbol: p.symbol,
						farmChain: [p.chain],
						farmProjectName: p.projectName,
						farmProject: p.project,
						farmTvlUsd: p.tvlUsd,
						farmApy: p.apy,
						farmApyBase: p.apyBase,
						farmApyReward: p.apyReward,
						strategy: 'loop'
					}))

	finalPools = finalPools.concat(loopPoolsFiltered)

	finalPools = finalPools.map((p) => {
		const ltv = applyCustomLtvToMax(p.ltv, customLTV)
		const totalApy = p.strategy === 'loop' ? p.loopApy : p.apy + p.borrow.apyBorrow * ltv + p.farmApy * ltv

		return {
			...p,
			totalApy,
			delta: totalApy - p.apy
		}
	})

	finalPools = finalPools
		.filter(
			(p) => Number.isFinite(p.delta) && p.delta > 1 && !(p.farmSymbol.includes(tokenToLend) && p.totalApy < p.farmApy)
		)
		.sort((a, b) => b.totalApy - a.totalApy)

	return finalPools
}

export const formatOptimizerPool = ({ pool, customLTV }) => {
	const ltv = resolveOptimizerLtv(pool.ltv ?? 0, customLTV)

	const lendingReward = (pool.apyBase || 0) + (pool.apyReward || 0)
	const borrowReward = (pool.borrow.apyBaseBorrow || 0) + (pool.borrow.apyRewardBorrow || 0)
	const totalReward = lendingReward + borrowReward * ltv
	const borrowAvailableUsd = pool.borrow.totalAvailableUsd

	return {
		...pool,
		lendingReward,
		borrowReward,
		totalReward,
		borrowAvailableUsd,
		totalBase: (pool.apyBase || 0) + (pool.borrow.apyBaseBorrow || 0) * ltv,
		lendingBase: pool.apyBase || 0,
		borrowBase: pool.borrow.apyBaseBorrow || 0
	}
}

export const findStrategyPoolsFR = ({
	token,
	filteredPools,
	perps
}: {
	token: { token?: string | string[]; excludeToken?: string | string[] } | null
	filteredPools: YieldPool[]
	perps: RawYieldPerpMarket[]
}): YieldLongShortStrategyCandidate[] => {
	let tokensToInclude = token?.token
	tokensToInclude = typeof tokensToInclude === 'string' ? [tokensToInclude] : tokensToInclude
	let tokensToExclude = token?.excludeToken
	tokensToExclude = typeof tokensToExclude === 'string' ? [tokensToExclude] : tokensToExclude

	const pools = filteredPools.filter((p) => {
		const farmSymbol = removeLendBorrowMetaTag(p.symbol)
		return (
			tokensToInclude?.some((t) =>
				t === 'ALL_USD_STABLES'
					? p.stablecoin
					: t === 'ALL_BITCOINS'
						? farmSymbol.includes('BTC')
						: farmSymbol.includes(t)
			) &&
			!tokensToExclude?.some((t) =>
				t === 'ALL_USD_STABLES'
					? p.stablecoin
					: t === 'ALL_BITCOINS'
						? farmSymbol.includes('BTC')
						: farmSymbol.includes(t)
			) &&
			p.apy > 0
		)
	})

	const perpsData = perps.filter(
		(p) => tokensToInclude?.some((t) => t.includes(p.symbol)) && p.fundingRate > 0 && p.baseAsset !== 'T'
	)

	const finalPools: YieldLongShortStrategyCandidate[] = []
	for (const pool of pools) {
		for (const perp of perpsData) {
			const fr8hPrevious = Number(perp.fundingRatePrevious) * 100
			const frCurrent = Number(perp.fundingRate) * 100
			const afr = fr8hPrevious * 3 * 365

			const afr7d = Number(perp.fundingRate7dSum) * 100 * 52
			const afr30d = Number(perp.fundingRate30dSum) * 100 * 12

			finalPools.push({
				...pool,
				symbolPerp: perp.market,
				fr8hCurrent: frCurrent.toFixed(3),
				afr,
				afr7d,
				afr30d,
				strategyAPY: pool.apy + afr,
				openInterest: Number(perp.openInterest),
				indexPrice: perp.indexPrice,
				chains: [pool.chain],
				marketplace: perp.marketplace,
				fundingRate7dAverage: (perp.fundingRate7dAverage * 100).toFixed(3)
			})
		}
	}

	return finalPools
}

interface FilterablePool {
	chain: string
	project: string
	projectName?: string
	farmProject?: string
	farmProjectName?: string
	stablecoin?: boolean
	exposure?: string
	ilRisk?: string
	hasMemeToken?: boolean
	tvlUsd: number
	farmTvlUsd?: number
	audits?: string
	outlier?: boolean
	predictions?: {
		predictedClass?: string
		binnedConfidence?: number
	}
	airdrop?: boolean
	apy: number
	lsdTokenOnly?: boolean
	borrow?: {
		totalAvailableUsd?: number | null
	}
	ltv?: number | null
}

interface FilterPools {
	selectedChainsSet: Set<string>
	selectedAttributes?: Array<string>
	selectedLendingProtocolsSet?: Set<string> | null
	pool: FilterablePool
	minTvl?: number | null
	maxTvl?: number | null
	minAvailable?: number | null
	maxAvailable?: number | null
	customLTV?: number | null
}

interface StrategyPoolFilters extends FilterPools {
	selectedFarmProtocolsSet?: Set<string> | null
}

function passesSelectedAttributes(pool: FilterablePool, selectedAttributes?: Array<string>) {
	if (!selectedAttributes) return true

	for (const attribute of selectedAttributes) {
		const attributeOption = attributeOptionsMap.get(attribute)

		if (attributeOption && !attributeOption.filterFn(pool)) return false
	}

	return true
}

function passesAvailableRange(pool: FilterablePool, minAvailable?: number | null, maxAvailable?: number | null) {
	const isValidAvailableRange = minAvailable != null || maxAvailable != null
	if (!isValidAvailableRange) return true

	const totalAvailableUsd = Number(pool.borrow?.totalAvailableUsd ?? 0)
	return (
		(minAvailable != null ? totalAvailableUsd >= +minAvailable : true) &&
		(maxAvailable != null ? totalAvailableUsd <= +maxAvailable : true)
	)
}

export const filterOptimizerPool = ({
	pool,
	selectedChainsSet,
	selectedAttributes,
	selectedLendingProtocolsSet,
	minTvl,
	maxTvl,
	minAvailable,
	maxAvailable,
	customLTV
}: FilterPools) => {
	let toFilter = true

	toFilter = toFilter && selectedChainsSet.has(pool.chain)
	if (selectedLendingProtocolsSet) {
		toFilter = toFilter && pool.projectName != null && selectedLendingProtocolsSet.has(pool.projectName)
	}
	toFilter = toFilter && passesSelectedAttributes(pool, selectedAttributes)

	const isValidTvlRange = minTvl != null || maxTvl != null

	if (isValidTvlRange) {
		toFilter =
			toFilter && (minTvl != null ? pool.tvlUsd >= minTvl : true) && (maxTvl != null ? pool.tvlUsd <= maxTvl : true)
	}

	toFilter = toFilter && passesAvailableRange(pool, minAvailable, maxAvailable)
	toFilter = toFilter && isValidOptimizerCustomLtv(pool.ltv, customLTV)

	return toFilter
}

export const filterStrategyPool = ({
	pool,
	selectedChainsSet,
	selectedAttributes,
	selectedLendingProtocolsSet,
	selectedFarmProtocolsSet,
	minTvl,
	maxTvl,
	minAvailable,
	maxAvailable,
	customLTV
}: StrategyPoolFilters) => {
	let toFilter = true

	toFilter = toFilter && selectedChainsSet.has(pool.chain)
	if (selectedLendingProtocolsSet) {
		toFilter = toFilter && pool.projectName != null && selectedLendingProtocolsSet.has(pool.projectName)
	}
	if (selectedFarmProtocolsSet) {
		toFilter = toFilter && pool.farmProjectName != null && selectedFarmProtocolsSet.has(pool.farmProjectName)
	}
	toFilter = toFilter && passesSelectedAttributes(pool, selectedAttributes)

	const isValidTvlRange = minTvl != null || maxTvl != null

	if (isValidTvlRange) {
		const strategyTvl = pool.farmTvlUsd ?? pool.tvlUsd
		toFilter =
			toFilter && (minTvl != null ? strategyTvl >= minTvl : true) && (maxTvl != null ? strategyTvl <= maxTvl : true)
	}

	toFilter = toFilter && passesAvailableRange(pool, minAvailable, maxAvailable)
	toFilter = toFilter && isValidStrategyCustomLtv(customLTV)

	return toFilter
}
