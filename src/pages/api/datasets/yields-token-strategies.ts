import type { NextApiRequest, NextApiResponse } from 'next'
import type { TokenStrategiesResponse } from '~/containers/Token/tokenStrategies.types'
import { getPerpData, getLendBorrowData } from '~/containers/Yields/queries/index'
import { matchesYieldPoolToken } from '~/containers/Yields/tokenFilter'
import { findOptimizerPools, findStrategyPoolsFR, formatOptimizerPool } from '~/containers/Yields/utils'

const CACHE_CONTROL = 'public, s-maxage=300, stale-while-revalidate=3600'

const LONG_SHORT_EXCLUDED_PROJECTS = new Set(['babydogeswap', 'cbridge'])
const LONG_SHORT_EXCLUDED_SYMBOLS = ['ADAI', 'DOP', 'COPI', 'EUROPOOL', 'UMAMI']

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
				matchesYieldPoolToken(pool.symbol, token)
		)
		.map((pool) => ({ ...pool, symbol: pool.symbol?.toUpperCase() }))
}

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse<TokenStrategiesResponse | { error: string }>
) {
	try {
		res.setHeader('Cache-Control', CACHE_CONTROL)

		const tokenQuery = req.query.token
		const token =
			typeof tokenQuery === 'string'
				? tokenQuery.trim().toUpperCase()
				: Array.isArray(tokenQuery)
					? tokenQuery[0]?.trim().toUpperCase()
					: ''

		if (!token) {
			res.status(400).json({ error: 'Missing token query param' })
			return
		}

		const [{ props }, perps] = await Promise.all([getLendBorrowData(), getPerpData()])

		const lendingPools = props.pools.filter((pool) => pool.category !== 'CDP' && !pool.mintedCoin)
		const cdpPools = props.pools
			.filter(
				(pool) => (pool.category === 'CDP' && pool.mintedCoin) || (pool.category === 'Lending' && pool.mintedCoin)
			)
			.map((pool) => ({ ...pool, chains: [pool.chain], borrow: { ...pool, symbol: pool.mintedCoin.toUpperCase() } }))

		const borrowAsCollateral = findOptimizerPools({
			pools: lendingPools,
			tokenToLend: token,
			tokenToBorrow: undefined,
			cdpRoutes: cdpPools
		})
			.filter(
				(pool) => matchesYieldPoolToken(pool.symbol, token) && !matchesYieldPoolToken(pool.borrow?.symbol ?? '', token)
			)
			.map((pool) => formatOptimizerPool({ pool, customLTV: null }))
			.sort((a, b) => (b.totalReward ?? Number.NEGATIVE_INFINITY) - (a.totalReward ?? Number.NEGATIVE_INFINITY))

		const borrowAsDebt = findOptimizerPools({
			pools: lendingPools,
			tokenToLend: undefined,
			tokenToBorrow: token,
			cdpRoutes: cdpPools
		})
			.filter((pool) => matchesYieldPoolToken(pool.borrow?.symbol ?? '', token))
			.map((pool) => formatOptimizerPool({ pool, customLTV: null }))
			.sort((a, b) => (b.totalReward ?? Number.NEGATIVE_INFINITY) - (a.totalReward ?? Number.NEGATIVE_INFINITY))

		const filteredLongShortPools = filterLongShortPools(props.allPools, token)
		const longShort = findStrategyPoolsFR({
			token: { token: [token] },
			filteredPools: filteredLongShortPools,
			perps
		}).sort((a, b) => (b.openInterest ?? Number.NEGATIVE_INFINITY) - (a.openInterest ?? Number.NEGATIVE_INFINITY))

		res.status(200).json({
			borrowAsCollateral,
			borrowAsDebt,
			longShort
		})
	} catch (error) {
		console.log('Error fetching token strategies data:', error)
		res.status(500).json({ error: 'Failed to fetch token strategies data' })
	}
}
