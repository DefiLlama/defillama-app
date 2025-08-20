import { NextApiRequest, NextApiResponse } from 'next'
import {
	PROTOCOLS_API,
	YIELD_CHAIN_API,
	YIELD_CONFIG_API,
	YIELD_LEND_BORROW_API,
	YIELD_POOLS_API,
	YIELD_URL_API
} from '~/constants'
import { formatYieldsPageData } from '~/containers/Yields/queries/utils'
import { fetchApi } from '~/utils/async'

const formatChain = (chain: string) => {
	if (chain.toLowerCase().includes('hyperliquid')) return 'Hyperliquid'
	return chain
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	try {
		const { chains } = req.query
		let chainList = typeof chains === 'string' ? [chains] : chains || []
		chainList = chainList.map(formatChain)
		const poolsAndConfig = await fetchApi([
			YIELD_POOLS_API,
			YIELD_CONFIG_API,
			YIELD_URL_API,
			YIELD_CHAIN_API,
			PROTOCOLS_API
		])

		const lendBorrowData: any[] = await fetchApi(YIELD_LEND_BORROW_API)

		const data = formatYieldsPageData(poolsAndConfig)
		let pools = data.pools || []

		if (Array.isArray(lendBorrowData) && lendBorrowData.length > 0) {
			const lendBorrowMap = new Map(lendBorrowData.map((b) => [b.pool, b]))

			pools = pools.map((p: any) => {
				const b = lendBorrowMap.get(p.pool)
				if (!b)
					return {
						...p,
						apyBorrow: 0,
						apyBaseBorrow: 0,
						apyRewardBorrow: 0,
						totalSupplyUsd: 0,
						totalBorrowUsd: 0,
						totalAvailableUsd: 0,
						ltv: 0
					}

				const apyBaseBorrow = b.apyBaseBorrow !== null ? -b.apyBaseBorrow : null
				const apyRewardBorrow = b.apyRewardBorrow
				const apyBorrow =
					apyBaseBorrow === null && apyRewardBorrow === null ? null : (apyBaseBorrow || 0) + (apyRewardBorrow || 0)
				let totalAvailableUsd: number | null = null
				if (b.totalSupplyUsd !== null && b.totalBorrowUsd !== null) {
					totalAvailableUsd = b.totalSupplyUsd - b.totalBorrowUsd
				}
				return {
					...p,
					apyBaseBorrow,
					apyRewardBorrow,
					apyBorrow,
					totalSupplyUsd: b.totalSupplyUsd,
					totalBorrowUsd: b.totalBorrowUsd,
					totalAvailableUsd,
					ltv: b.ltv
				}
			})
		}

		const transformedPools = pools.map((pool: any) => ({
			pool: pool.symbol,
			configID: pool.pool,
			projectslug: pool.project,
			project: pool.projectName,
			airdrop: pool.airdrop,
			chains: [pool.chain],
			tvl: pool.tvlUsd,
			apy: pool.apy,
			apyBase: pool.apyBase,
			apyReward: pool.apyReward,
			rewardTokensSymbols: pool.rewardTokensSymbols || [],
			change1d: pool.apyPct1D,
			change7d: pool.apyPct7D,
			il7d: pool.il7d,
			apyBase7d: pool.apyBase7d,
			apyNet7d: pool.apyNet7d,
			apyMean30d: pool.apyMean30d,
			volumeUsd1d: pool.volumeUsd1d,
			volumeUsd7d: pool.volumeUsd7d,
			apyBaseBorrow: pool.apyBaseBorrow,
			apyRewardBorrow: pool.apyRewardBorrow,
			apyBorrow: pool.apyBorrow,
			totalSupplyUsd: pool.totalSupplyUsd,
			totalBorrowUsd: pool.totalBorrowUsd,
			totalAvailableUsd: pool.totalAvailableUsd,
			ltv: pool.ltv,
			poolMeta: pool.poolMeta
		}))

		let filteredPools = transformedPools
		if (chainList.length > 0 && !chainList.includes('All')) {
			filteredPools = transformedPools.filter((pool: any) =>
				pool.chains.some((chain: string) => chainList.some((c: string) => c.toLowerCase() === chain.toLowerCase()))
			)
		}

		const sortedPools = filteredPools.filter((p: any) => p.tvl > 0).sort((a: any, b: any) => b.apy - a.apy)

		res.status(200).json(sortedPools)
	} catch (error) {
		console.error('Error fetching yields data:', error)
		res.status(500).json({ error: 'Failed to fetch yields data' })
	}
}
