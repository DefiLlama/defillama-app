import { YIELD_CHAIN_API, YIELD_CONFIG_API, YIELD_LEND_BORROW_API, YIELD_POOLS_API, YIELD_URL_API } from '~/constants'
import { fetchProtocols } from '~/containers/Protocols/api'
import { formatYieldsPageData } from '~/containers/Yields/queries/utils'
import type { IYieldTableRow } from '~/containers/Yields/Tables/types'
import { matchesYieldPoolToken } from '~/containers/Yields/tokenFilter'
import { fetchJson } from '~/utils/async'

const formatChain = (chain: string) => {
	if (chain.toLowerCase().includes('hyperliquid')) return 'Hyperliquid'
	return chain
}

export async function getTokenYieldsRows(token: string, chains?: string | string[]): Promise<IYieldTableRow[]> {
	const chainList = (typeof chains === 'string' ? [chains] : chains || []).map(formatChain)
	const tokenFilter = token.trim()
	const poolsAndConfig = await Promise.all([
		fetchJson(YIELD_POOLS_API),
		fetchJson(YIELD_CONFIG_API),
		fetchJson(YIELD_URL_API),
		fetchJson(YIELD_CHAIN_API),
		fetchProtocols()
	])

	const lendBorrowData: any[] = await fetchJson(YIELD_LEND_BORROW_API)
	const data = formatYieldsPageData(poolsAndConfig)
	let pools = data.pools || []

	if (Array.isArray(lendBorrowData) && lendBorrowData.length > 0) {
		const lendBorrowMap = new Map(lendBorrowData.map((entry) => [entry.pool, entry]))

		pools = pools.map((pool: any) => {
			const lendBorrowEntry = lendBorrowMap.get(pool.pool)
			if (!lendBorrowEntry) {
				return {
					...pool,
					apyBorrow: 0,
					apyBaseBorrow: 0,
					apyRewardBorrow: 0,
					totalSupplyUsd: 0,
					totalBorrowUsd: 0,
					totalAvailableUsd: 0,
					ltv: 0
				}
			}

			const apyBaseBorrow = lendBorrowEntry.apyBaseBorrow !== null ? -lendBorrowEntry.apyBaseBorrow : null
			const apyRewardBorrow = lendBorrowEntry.apyRewardBorrow
			const apyBorrow =
				apyBaseBorrow === null && apyRewardBorrow === null ? null : (apyBaseBorrow || 0) + (apyRewardBorrow || 0)
			const totalAvailableUsd =
				lendBorrowEntry.totalSupplyUsd !== null && lendBorrowEntry.totalBorrowUsd !== null
					? lendBorrowEntry.totalSupplyUsd - lendBorrowEntry.totalBorrowUsd
					: null

			return {
				...pool,
				apyBaseBorrow,
				apyRewardBorrow,
				apyBorrow,
				totalSupplyUsd: lendBorrowEntry.totalSupplyUsd,
				totalBorrowUsd: lendBorrowEntry.totalBorrowUsd,
				totalAvailableUsd,
				ltv: lendBorrowEntry.ltv
			}
		})
	}

	const transformedPools: IYieldTableRow[] = pools.map((pool: any) => ({
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
		poolMeta: pool.poolMeta,
		category: pool.category,
		stablecoin: pool.stablecoin,
		exposure: pool.exposure,
		ilRisk: pool.ilRisk,
		audits: pool.audits,
		outlier: pool.outlier,
		predictions: pool.predictions,
		apyIncludingLsdApy: pool.apyIncludingLsdApy,
		apyBaseIncludingLsdApy: pool.apyBaseIncludingLsdApy,
		apyLsd: pool.apyLsd,
		lsdTokenOnly: pool.lsdTokenOnly,
		rewards: pool.rewardTokens || [],
		url: pool.url,
		confidence: pool.confidence ?? null
	}))

	let filteredPools = transformedPools
	if (chainList.length > 0 && !chainList.includes('All')) {
		filteredPools = transformedPools.filter((pool) =>
			pool.chains.some((chain) => chainList.some((item) => item.toLowerCase() === chain.toLowerCase()))
		)
	}

	if (tokenFilter) {
		filteredPools = filteredPools.filter((pool) => matchesYieldPoolToken(pool.pool, tokenFilter))
	}

	return filteredPools.filter((pool) => (pool.tvl ?? 0) > 0).sort((a, b) => (b.apy ?? 0) - (a.apy ?? 0))
}
