import { getPerpData, getLendBorrowData } from '~/containers/Yields/queries/index'
import { matchesYieldPoolToken } from '~/containers/Yields/tokenFilter'
import { findOptimizerPools, findStrategyPoolsFR, formatOptimizerPool } from '~/containers/Yields/utils'
import type { TokenStrategiesResponse } from './tokenStrategies.types'

const LONG_SHORT_EXCLUDED_PROJECTS = new Set(['babydogeswap', 'cbridge'])
const LONG_SHORT_EXCLUDED_SYMBOLS = ['ADAI', 'DOP', 'COPI', 'EUROPOOL', 'UMAMI']

function matchesLongShortPoolToken(poolSymbol: string, tokenSymbol: string) {
	if (matchesYieldPoolToken(poolSymbol, tokenSymbol)) return true

	const normalizedPoolSymbol = poolSymbol?.toUpperCase() ?? ''
	const normalizedTokenSymbol = tokenSymbol?.trim().toUpperCase() ?? ''

	if (!normalizedPoolSymbol || !normalizedTokenSymbol) return false

	return normalizedTokenSymbol.length >= 4 && normalizedPoolSymbol.includes(normalizedTokenSymbol)
}

function filterLongShortPools(
	allPools: Awaited<ReturnType<typeof getLendBorrowData>>['props']['allPools'],
	token: string
) {
	return allPools
		.filter(
			(pool) =>
				pool.ilRisk === 'no' &&
				pool.exposure === 'single' &&
				pool.apy > 0 &&
				!LONG_SHORT_EXCLUDED_PROJECTS.has(pool.project) &&
				!LONG_SHORT_EXCLUDED_SYMBOLS.some((excludedSymbol) => pool.symbol.includes(excludedSymbol)) &&
				matchesLongShortPoolToken(pool.symbol, token)
		)
		.map((pool) => ({ ...pool, symbol: pool.symbol?.toUpperCase() }))
}

export async function getTokenStrategiesData(token: string): Promise<TokenStrategiesResponse> {
	const normalizedToken = token.trim().toUpperCase()
	const [{ props }, perps] = await Promise.all([getLendBorrowData(), getPerpData()])

	const lendingPools = props.pools.filter((pool) => pool.category !== 'CDP' && !pool.mintedCoin)
	const cdpPools = props.pools
		.filter((pool) => (pool.category === 'CDP' && pool.mintedCoin) || (pool.category === 'Lending' && pool.mintedCoin))
		.map((pool) => ({ ...pool, chains: [pool.chain], borrow: { ...pool, symbol: pool.mintedCoin.toUpperCase() } }))

	const borrowAsCollateral = findOptimizerPools({
		pools: lendingPools,
		tokenToLend: normalizedToken,
		tokenToBorrow: undefined,
		cdpRoutes: cdpPools
	})
		.filter(
			(pool) =>
				matchesYieldPoolToken(pool.symbol, normalizedToken) &&
				!matchesYieldPoolToken(pool.borrow?.symbol ?? '', normalizedToken)
		)
		.map((pool) => formatOptimizerPool({ pool, customLTV: null }))
		.sort((a, b) => (b.totalReward ?? Number.NEGATIVE_INFINITY) - (a.totalReward ?? Number.NEGATIVE_INFINITY))

	const borrowAsDebt = findOptimizerPools({
		pools: lendingPools,
		tokenToLend: undefined,
		tokenToBorrow: normalizedToken,
		cdpRoutes: cdpPools
	})
		.filter((pool) => matchesYieldPoolToken(pool.borrow?.symbol ?? '', normalizedToken))
		.map((pool) => formatOptimizerPool({ pool, customLTV: null }))
		.sort((a, b) => (b.totalReward ?? Number.NEGATIVE_INFINITY) - (a.totalReward ?? Number.NEGATIVE_INFINITY))

	const filteredLongShortPools = filterLongShortPools(props.allPools, normalizedToken)
	const longShort = findStrategyPoolsFR({
		token: { token: [normalizedToken] },
		filteredPools: filteredLongShortPools,
		perps
	}).sort((a, b) => (b.openInterest ?? Number.NEGATIVE_INFINITY) - (a.openInterest ?? Number.NEGATIVE_INFINITY))

	return {
		borrowAsCollateral,
		borrowAsDebt,
		longShort
	}
}
