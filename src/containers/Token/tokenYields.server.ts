import { buildYieldTableRowsWithBorrowData } from '~/containers/Yields/poolsPipeline'
import { getLendBorrowDataFromYieldPageData, getYieldPageDataFromNetwork } from '~/containers/Yields/queries/index'
import type { IYieldTableRow } from '~/containers/Yields/Tables/types'
import { matchesYieldPoolToken } from '~/containers/Yields/tokenFilter'

const formatChain = (chain: string) => {
	if (chain.toLowerCase().includes('hyperliquid')) return 'Hyperliquid'
	return chain
}

export async function fetchTokenYieldSourceDataFromNetwork(): Promise<IYieldTableRow[]> {
	const data = await getYieldPageDataFromNetwork()
	const lendBorrowData = await getLendBorrowDataFromYieldPageData(data)
	return buildYieldTableRowsWithBorrowData(data.props.pools || [], lendBorrowData.props.pools || [])
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
