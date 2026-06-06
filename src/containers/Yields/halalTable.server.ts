import type { ParsedUrlQuery } from 'querystring'
import { filterYieldPools } from './domain/poolFilters'
import { mapPoolToYieldTableRow } from './domain/poolRows'
import type { IYieldTableRow } from './Tables/types'
import type { YieldPageData, YieldPool } from './types'
import { getYieldPoolFilterState } from './yieldsTable.server'
import { paginateAndSortRows } from './yieldsTablePagination.server'
import type { YieldHalalPageResponse } from './yieldsTableQuery'

const HALAL_PROJECT_WHITELIST = [
	'Curve',
	'Lido',
	'Convex Finance',
	'Uniswap V2',
	'Uniswap V3',
	'Arrakis Finance',
	'PancakeSwap',
	'Osmosis',
	'Balancer',
	'VVS Finance',
	'Stargate',
	'SushiSwap',
	'DefiChain DEX',
	'Aura',
	'Biswap',
	'Quickswap',
	'Maiar Exchange',
	'Ankr',
	'Raydium',
	'Wombat Exchange',
	'Trader Joe',
	'Atrix',
	'Platypus Finance',
	'Vector Finance',
	'LooksRare',
	'MDEX',
	'cBridge',
	'Bancor V3',
	'Ellipsis Finance',
	'Concentrator',
	'Velodrome',
	'Beethoven X',
	'Across',
	'SpookySwap',
	'Meshswap',
	'Kokonut Swap',
	'Flamingo Finance',
	'Pangolin',
	'Dot Dot Finance',
	'Loopring',
	'Trisolaris',
	'ApeSwap AMM',
	'MM Finance Polygon',
	'Solidly V2'
] as const

const HALAL_BLACKLISTED_TOKENS = ['AUSDT', 'OUSD', 'AUSDC']

function getHalalPools(pools: YieldPool[]): YieldPool[] {
	const filteredPools = []
	for (const pool of pools) {
		if (!HALAL_PROJECT_WHITELIST.includes(pool.projectName as (typeof HALAL_PROJECT_WHITELIST)[number])) continue
		let hasBlacklistedToken = false
		for (const token of HALAL_BLACKLISTED_TOKENS) {
			if (pool.symbol.includes(token)) {
				hasBlacklistedToken = true
				break
			}
		}
		if (!hasBlacklistedToken) filteredPools.push(pool)
	}
	return filteredPools
}

function getHalalCategoryList(pools: YieldPool[]): string[] {
	const categories = new Set<string>()
	for (const pool of pools) {
		if (pool.category) categories.add(pool.category)
	}
	return Array.from(categories)
}

export function buildYieldHalalPageMetadata(data: YieldPageData) {
	const pools = getHalalPools(data.props.pools)
	const {
		pools: _pools,
		stablecoinInfoBySymbol: _stablecoinInfoBySymbol,
		tokenCategories: _tokenCategories,
		usdPeggedSymbols: _usdPeggedSymbols,
		...metadata
	} = data.props

	return {
		...metadata,
		projectList: getHalalProjectList(data.props.projectList),
		categoryList: getHalalCategoryList(pools)
	}
}

function getHalalProjectList(projectList: string[]): string[] {
	const projects: string[] = []
	for (const project of projectList) {
		if (HALAL_PROJECT_WHITELIST.includes(project as (typeof HALAL_PROJECT_WHITELIST)[number])) {
			projects.push(project)
		}
	}
	return projects
}

export function buildYieldHalalPageResponse(data: YieldPageData, query: ParsedUrlQuery): YieldHalalPageResponse {
	const metadata = buildYieldHalalPageMetadata(data)
	const filteredPools = filterYieldPools({
		pools: getHalalPools(data.props.pools),
		view: 'unknown',
		filters: getYieldPoolFilterState({
			projectList: metadata.projectList,
			chainList: metadata.chainList,
			categoryList: metadata.categoryList,
			evmChains: metadata.evmChains,
			query
		}),
		usdPeggedSymbols: data.props.usdPeggedSymbols,
		tokenCategories: data.props.tokenCategories
	})
	const rows: IYieldTableRow[] = []

	for (const pool of filteredPools) {
		rows.push(mapPoolToYieldTableRow(pool, { stablecoinInfoBySymbol: data.props.stablecoinInfoBySymbol }))
	}

	return paginateAndSortRows<IYieldTableRow, keyof IYieldTableRow>({
		rows,
		query,
		fallbackSortAccessor: (row, sortBy) => row[sortBy as keyof IYieldTableRow]
	})
}
