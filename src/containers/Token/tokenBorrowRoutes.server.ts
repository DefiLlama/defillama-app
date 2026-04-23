import { getLendBorrowDataFromNetwork } from '~/containers/Yields/queries/index'
import { matchesYieldPoolToken } from '~/containers/Yields/tokenFilter'
import { findOptimizerPools, formatOptimizerPool } from '~/containers/Yields/utils'
import type { TokenBorrowRoutesResponse } from './tokenBorrowRoutes.types'

type LendBorrowPools = Awaited<ReturnType<typeof getLendBorrowDataFromNetwork>>['props']['pools']

export function buildTokenBorrowRoutesData(token: string, pools: LendBorrowPools): TokenBorrowRoutesResponse {
	const normalizedToken = token.trim().toUpperCase()
	const lendingPools = pools.filter((pool) => pool.category !== 'CDP' && !pool.mintedCoin)
	const cdpPools = pools
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

	return {
		borrowAsCollateral,
		borrowAsDebt
	}
}

export async function getTokenBorrowRoutesDataFromNetwork(token: string): Promise<TokenBorrowRoutesResponse> {
	const { props } = await getLendBorrowDataFromNetwork()
	return buildTokenBorrowRoutesData(token, props.pools)
}

export async function getTokenBorrowRoutesData(token: string): Promise<TokenBorrowRoutesResponse> {
	return getTokenBorrowRoutesDataFromNetwork(token)
}
