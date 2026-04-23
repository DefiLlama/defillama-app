import { YIELD_CHAIN_API, YIELD_CONFIG_API, YIELD_LEND_BORROW_API, YIELD_POOLS_API, YIELD_URL_API } from '~/constants'
import { fetchProtocols } from '~/containers/Protocols/api'
import { buildYieldTableRowsWithBorrowData } from '~/containers/Yields/poolsPipeline'
import { formatYieldsPageData } from '~/containers/Yields/queries/utils'
import type { IYieldTableRow } from '~/containers/Yields/Tables/types'
import { matchesYieldPoolToken } from '~/containers/Yields/tokenFilter'
import { fetchJson } from '~/utils/async'

const formatChain = (chain: string) => {
	if (chain.toLowerCase().includes('hyperliquid')) return 'Hyperliquid'
	return chain
}

export async function fetchTokenYieldSourceDataFromNetwork(): Promise<IYieldTableRow[]> {
	const poolsAndConfig = await Promise.all([
		fetchJson(YIELD_POOLS_API),
		fetchJson(YIELD_CONFIG_API),
		fetchJson(YIELD_URL_API),
		fetchJson(YIELD_CHAIN_API),
		fetchProtocols()
	])

	const lendBorrowData: any[] = await fetchJson(YIELD_LEND_BORROW_API)
	const data = formatYieldsPageData(poolsAndConfig)
	return buildYieldTableRowsWithBorrowData(data.pools || [], lendBorrowData)
}

export function filterTokenYieldRows(
	transformedPools: IYieldTableRow[],
	token: string,
	chains?: string | string[]
): IYieldTableRow[] {
	const chainList = (typeof chains === 'string' ? [chains] : chains || []).map(formatChain)
	const tokenFilter = token.trim()
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

export async function getTokenYieldsRowsFromNetwork(
	token: string,
	chains?: string | string[]
): Promise<IYieldTableRow[]> {
	const transformedPools = await fetchTokenYieldSourceDataFromNetwork()
	return filterTokenYieldRows(transformedPools, token, chains)
}

export async function getTokenYieldsRows(token: string, chains?: string | string[]): Promise<IYieldTableRow[]> {
	return getTokenYieldsRowsFromNetwork(token, chains)
}
