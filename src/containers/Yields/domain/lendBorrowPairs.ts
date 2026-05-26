export const excludedOptimizerProjects = new Set(['silo-v2'])

export const isStableToken = (token) => token?.toUpperCase() === 'USD_STABLES'

export const removeLendBorrowMetaTag = (symbol) => symbol.replace(/ *\([^)]*\) */g, '')

export const matchesLendBorrowToken = (symbol, tokenToMatch) => {
	if (!tokenToMatch) return false

	const cleanSymbol = removeLendBorrowMetaTag(symbol).toUpperCase()
	const cleanToken = removeLendBorrowMetaTag(tokenToMatch).toUpperCase()

	if (cleanSymbol.includes(cleanToken)) return true

	return false
}

type PairMode = 'optimizer' | 'strategy'

interface BuildLendBorrowPairsOptions {
	pools: Array<any>
	tokenToLend?: string | null
	tokenToBorrow?: string | null
	mode: PairMode
}

function buildAvailableToLend(pools: Array<any>, tokenToLend: string | null | undefined, mode: PairMode) {
	return pools.filter(({ symbol, ltv }) => {
		if (mode === 'optimizer' && (!tokenToLend || isStableToken(tokenToLend))) return true

		return (
			(isStableToken(tokenToLend) ? true : matchesLendBorrowToken(symbol, tokenToLend)) &&
			ltv > 0 &&
			!matchesLendBorrowToken(symbol, 'AMM')
		)
	})
}

function shouldKeepBorrowPool({
	pool,
	tokenToLend,
	tokenToBorrow,
	availableProjectsSet,
	availableChainsSet,
	mode
}: {
	pool: any
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
	collateralPool: any
	borrowPool: any
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

export function buildLendBorrowPairs({ pools, tokenToLend, tokenToBorrow, mode }: BuildLendBorrowPairsOptions) {
	const availableToLend = buildAvailableToLend(pools, tokenToLend, mode)
	const availableCollateralPools =
		mode === 'optimizer'
			? availableToLend.filter((pool) => !excludedOptimizerProjects.has(pool.project))
			: availableToLend

	const availableProjectsSet = new Set(availableToLend.map(({ project }) => project))
	const availableChainsSet = new Set(availableToLend.map(({ chain }) => chain))

	return pools.reduce((acc, pool) => {
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
			return acc
		}

		const collateralPools = availableCollateralPools.filter((collateralPool) =>
			canUseCollateralPool({ collateralPool, borrowPool: pool, tokenToLend, tokenToBorrow, mode })
		)

		const poolPairs = collateralPools.map((collateralPool) => ({
			...collateralPool,
			chains: [collateralPool.chain],
			borrow: pool,
			ltv: collateralPool.project === 'euler' ? collateralPool.ltv * pool.borrowFactor : collateralPool.ltv
		}))

		return acc.concat(poolPairs)
	}, [])
}
