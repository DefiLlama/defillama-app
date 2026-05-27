import type { YieldPerpMarket } from '../api.types'
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
	const lendBorrowPairs = buildLendBorrowPairs({ pools, tokenToLend, tokenToBorrow, mode: 'optimizer' })

	if (tokenToLend && tokenToBorrow) {
		const lendIsStableToken = isStableToken(tokenToLend)
		const borrowIsStableToken = isStableToken(tokenToBorrow)
		for (const pool of cdpRoutes) {
			if (excludedOptimizerProjects.has(pool.project)) continue
			if (lendIsStableToken ? !pool.stablecoin : !matchesLendBorrowToken(pool.symbol, tokenToLend)) continue
			if (!borrowIsStableToken && !matchesLendBorrowToken(pool.borrow.symbol, tokenToBorrow)) continue
			lendBorrowPairs.push(pool)
		}
	}

	return lendBorrowPairs
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
	cdpRoutes: LendBorrowPairPool[]
	customLTV?: number | null
}): YieldStrategyCandidate[] => {
	const loopPools = calculateLoopAPY(pools, 10, customLTV)
	const lendBorrowPairs = buildLendBorrowPairs({ pools, tokenToLend, tokenToBorrow, mode: 'strategy' })

	if (tokenToLend) {
		for (const cdpRoute of cdpRoutes) {
			if (!matchesLendBorrowToken(cdpRoute.symbol, tokenToLend)) continue
			if (tokenToBorrow && !matchesLendBorrowToken(cdpRoute.borrow.symbol, tokenToBorrow)) continue
			lendBorrowPairs.push(cdpRoute)
		}
	}

	let finalPools: YieldStrategyCandidate[] = []
	if (tokenToBorrow) {
		const farmPools: YieldPool[] = []
		const borrowIsStableToken = isStableToken(tokenToBorrow)
		for (const pool of allPools) {
			if (borrowIsStableToken ? pool.stablecoin : matchesLendBorrowToken(pool.symbol, tokenToBorrow)) {
				farmPools.push(pool)
			}
		}

		for (const p of lendBorrowPairs) {
			for (const i of farmPools) {
				if (p.chain !== i.chain) continue
				if (
					borrowIsStableToken
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

	if (tokenToBorrow === tokenToLend || !tokenToBorrow?.length) {
		for (const p of loopPools) {
			if (!matchesLendBorrowToken(p.symbol, tokenToLend)) continue

			finalPools.push({
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
			})
		}
	}

	const filteredFinalPools: YieldStrategyCandidate[] = []
	for (const p of finalPools) {
		const ltv = applyCustomLtvToMax(p.ltv, customLTV)
		const totalApy = p.strategy === 'loop' ? p.loopApy : p.apy + p.borrow.apyBorrow * ltv + p.farmApy * ltv
		const delta = totalApy - p.apy

		if (!Number.isFinite(delta) || delta <= 1) continue
		if (p.farmSymbol.includes(tokenToLend) && totalApy < p.farmApy) continue
		filteredFinalPools.push({ ...p, totalApy, delta })
	}

	filteredFinalPools.sort((a, b) => b.totalApy - a.totalApy)
	return filteredFinalPools
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
	perps: YieldPerpMarket[]
}): YieldLongShortStrategyCandidate[] => {
	let tokensToInclude = token?.token
	tokensToInclude = typeof tokensToInclude === 'string' ? [tokensToInclude] : tokensToInclude
	let tokensToExclude = token?.excludeToken
	tokensToExclude = typeof tokensToExclude === 'string' ? [tokensToExclude] : tokensToExclude
	if (!tokensToInclude?.length) return []

	const pools: YieldPool[] = []
	for (const p of filteredPools) {
		const farmSymbol = removeLendBorrowMetaTag(p.symbol)
		let included = false
		for (const t of tokensToInclude) {
			if (
				t === 'ALL_USD_STABLES'
					? p.stablecoin
					: t === 'ALL_BITCOINS'
						? farmSymbol.includes('BTC')
						: farmSymbol.includes(t)
			) {
				included = true
				break
			}
		}
		if (!included || p.apy <= 0) continue

		let excluded = false
		if (tokensToExclude) {
			for (const t of tokensToExclude) {
				if (
					t === 'ALL_USD_STABLES'
						? p.stablecoin
						: t === 'ALL_BITCOINS'
							? farmSymbol.includes('BTC')
							: farmSymbol.includes(t)
				) {
					excluded = true
					break
				}
			}
		}
		if (!excluded) pools.push(p)
	}

	const perpsData: YieldPerpMarket[] = []
	for (const perp of perps) {
		if (perp.fundingRate <= 0 || perp.baseAsset === 'T') continue
		for (const tokenToInclude of tokensToInclude) {
			if (tokenToInclude.includes(perp.symbol)) {
				perpsData.push(perp)
				break
			}
		}
	}

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
