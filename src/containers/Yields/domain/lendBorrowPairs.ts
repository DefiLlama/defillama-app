import type { LendBorrowPool } from '../types'
import { getEffectiveLtv } from './ltv'

export const excludedOptimizerProjects = new Set(['silo-v2'])

export const isStableToken = (token?: string | null) => token?.toUpperCase() === 'USD_STABLES'

export const removeLendBorrowMetaTag = (symbol: string) => symbol.replace(/ *\([^)]*\) */g, '')

export const matchesLendBorrowToken = (symbol?: string | null, tokenToMatch?: string | null) => {
	if (!symbol) return false
	if (!tokenToMatch) return false

	const cleanSymbol = removeLendBorrowMetaTag(symbol).toUpperCase()
	const cleanToken = removeLendBorrowMetaTag(tokenToMatch).toUpperCase()

	if (cleanSymbol.includes(cleanToken)) return true

	return false
}

type PairMode = 'optimizer' | 'strategy'

interface BuildLendBorrowPairsOptions {
	pools: LendBorrowPool[]
	tokenToLend?: string | null
	tokenToBorrow?: string | null
	mode: PairMode
}

export type LendBorrowPoolWithLtv = LendBorrowPool & { ltv: number }

export interface LendBorrowPairPool extends LendBorrowPoolWithLtv {
	chains: string[]
	borrow: LendBorrowPool
}

export function hasPositiveLtv(pool: LendBorrowPool): pool is LendBorrowPoolWithLtv {
	return pool.ltv != null && pool.ltv > 0
}

function buildAvailableToLend(
	pools: LendBorrowPool[],
	tokenToLend: string | null | undefined,
	mode: PairMode
): LendBorrowPoolWithLtv[] {
	const availableToLend: LendBorrowPoolWithLtv[] = []
	for (const pool of pools) {
		if (!hasPositiveLtv(pool)) continue
		const { symbol } = pool
		if (mode === 'optimizer' && (!tokenToLend || isStableToken(tokenToLend))) {
			availableToLend.push(pool)
			continue
		}

		if (
			(isStableToken(tokenToLend) ? true : matchesLendBorrowToken(symbol, tokenToLend)) &&
			!matchesLendBorrowToken(symbol, 'AMM')
		) {
			availableToLend.push(pool)
		}
	}
	return availableToLend
}

function shouldKeepBorrowPool({
	pool,
	tokenToLend,
	tokenToBorrow,
	availableProjectsSet,
	availableChainsSet,
	mode
}: {
	pool: LendBorrowPool
	tokenToLend?: string | null
	tokenToBorrow?: string | null
	availableProjectsSet: Set<string>
	availableChainsSet: Set<string>
	mode: PairMode
}) {
	if (mode === 'optimizer' && excludedOptimizerProjects.has(pool.project)) return false
	if (!availableProjectsSet.has(pool.project) || !availableChainsSet.has(pool.chain)) return false
	if (tokenToBorrow && (isStableToken(tokenToBorrow) ? false : !matchesLendBorrowToken(pool.symbol, tokenToBorrow)))
		return false
	if (mode === 'strategy' && !tokenToBorrow) return false
	if (matchesLendBorrowToken(pool.symbol, 'AMM')) return false
	if (pool.borrowable === false) return false
	if (mode === 'strategy' && pool.apyBorrow === null) return false
	if (mode === 'optimizer' && pool.project === 'liqee' && (tokenToLend === 'RETH' || tokenToBorrow === 'RETH'))
		return false
	if (isStableToken(tokenToBorrow) && !pool.stablecoin) return false

	return true
}

function canUseCollateralPool({
	collateralPool,
	borrowPool,
	tokenToLend,
	tokenToBorrow,
	mode
}: {
	collateralPool: LendBorrowPoolWithLtv
	borrowPool: LendBorrowPool
	tokenToLend?: string | null
	tokenToBorrow?: string | null
	mode: PairMode
}) {
	if (mode === 'optimizer' && !tokenToBorrow) return true

	return (
		collateralPool.chain === borrowPool.chain &&
		collateralPool.project === borrowPool.project &&
		(mode === 'optimizer'
			? (tokenToLend === 'STETH' && tokenToBorrow === 'ETH') ||
				!matchesLendBorrowToken(collateralPool.symbol, tokenToBorrow)
			: tokenToBorrow
				? !matchesLendBorrowToken(collateralPool.symbol, tokenToBorrow)
				: true) &&
		collateralPool.pool !== borrowPool.pool &&
		(borrowPool.project === 'solend' ? collateralPool.poolMeta === borrowPool.poolMeta : true) &&
		(isStableToken(tokenToLend) ? collateralPool.stablecoin : true) &&
		(mode === 'optimizer'
			? borrowPool.project === 'compound-v3'
				? borrowPool.borrowable && collateralPool.poolMeta === borrowPool.poolMeta
				: true
			: borrowPool.project === 'compound-v3'
				? matchesLendBorrowToken(borrowPool.symbol, 'USDC')
				: true)
	)
}

export function buildLendBorrowPairs({
	pools,
	tokenToLend,
	tokenToBorrow,
	mode
}: BuildLendBorrowPairsOptions): LendBorrowPairPool[] {
	const availableToLend = buildAvailableToLend(pools, tokenToLend, mode)
	const availableCollateralPools: LendBorrowPoolWithLtv[] = []
	const availableProjectsSet = new Set<string>()
	const availableChainsSet = new Set<string>()

	for (const pool of availableToLend) {
		availableProjectsSet.add(pool.project)
		availableChainsSet.add(pool.chain)
		if (mode !== 'optimizer' || !excludedOptimizerProjects.has(pool.project)) {
			availableCollateralPools.push(pool)
		}
	}

	const pairs: LendBorrowPairPool[] = []
	for (const pool of pools) {
		if (
			!shouldKeepBorrowPool({
				pool,
				tokenToLend,
				tokenToBorrow,
				availableProjectsSet,
				availableChainsSet,
				mode
			})
		) {
			continue
		}

		for (const collateralPool of availableCollateralPools) {
			if (!canUseCollateralPool({ collateralPool, borrowPool: pool, tokenToLend, tokenToBorrow, mode })) continue

			const ltv = getEffectiveLtv({
				project: collateralPool.project,
				ltv: collateralPool.ltv,
				borrowFactor: pool.borrowFactor
			})
			if (ltv == null) continue

			pairs.push({
				...collateralPool,
				chains: [collateralPool.chain],
				borrow: pool,
				ltv
			})
		}
	}

	return pairs
}
