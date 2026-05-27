import type { ParsedUrlQuery } from 'querystring'
import type { IResponseCGMarketsAPI } from '~/api/coingecko.types'
import type { YieldPerpMarket } from './api.types'
import { filterStrategyPool, findStrategyPoolsFR, type YieldLongShortStrategyCandidate } from './domain/strategyFilters'
import { decodeYieldsQuery } from './queryState'
import type { YieldLongShortStrategyTableRow } from './Tables/types'
import type { YieldPageData, YieldPool } from './types'
import { buildYieldTokenOptions } from './yieldsTable.server'
import {
	paginateAndSortRows,
	type YieldsTableSort,
	type YieldsTableSortAccessors
} from './yieldsTablePagination.server'
import type { YieldLongShortStrategyPageResponse } from './yieldsTableQuery'

const LONG_SHORT_DEFAULT_SORT: YieldsTableSort<keyof YieldLongShortStrategyTableRow> = {
	sortBy: 'openInterest',
	sortDesc: true
}

const LONG_SHORT_SORT_ACCESSORS: YieldsTableSortAccessors<
	YieldLongShortStrategyTableRow,
	keyof YieldLongShortStrategyTableRow
> = {
	strategyAPY: (row) => row.strategyAPY,
	apy: (row) => row.apy,
	afr: (row) => row.afr,
	fr8hCurrent: (row) => row.fr8hCurrent,
	fundingRate7dAverage: (row) => row.fundingRate7dAverage,
	tvlUsd: (row) => row.tvlUsd,
	openInterest: (row) => row.openInterest
}

function getLongShortFilteredPools(data: YieldPageData) {
	const pools: YieldPool[] = []
	for (const pool of data.props.pools) {
		if (
			pool.ilRisk === 'no' &&
			pool.exposure === 'single' &&
			pool.apy > 0 &&
			pool.project !== 'babydogeswap' &&
			pool.project !== 'cbridge' &&
			!pool.symbol.includes('ADAI') &&
			!pool.symbol.includes('DOP') &&
			!pool.symbol.includes('COPI') &&
			!pool.symbol.includes('EUROPOOL') &&
			!pool.symbol.includes('UMAMI')
		) {
			pools.push({ ...pool, symbol: pool.symbol.toUpperCase() })
		}
	}
	return pools
}

export function buildYieldLongShortPageMetadata(data: YieldPageData, cgList: Array<IResponseCGMarketsAPI>) {
	const filteredPools = getLongShortFilteredPools(data)
	const poolsUniqueSymbols = new Set<string>()
	for (const pool of filteredPools) {
		poolsUniqueSymbols.add(pool.symbol)
	}

	const matchingTokens: IResponseCGMarketsAPI[] = []
	for (const token of cgList) {
		if (poolsUniqueSymbols.has(token.symbol?.toUpperCase())) {
			matchingTokens.push(token)
		}
	}
	const tokens = buildYieldTokenOptions(matchingTokens)

	return {
		chainList: data.props.chainList,
		projectList: data.props.projectList,
		categoryList: data.props.categoryList,
		evmChains: data.props.evmChains,
		tokens
	}
}

function serializeLongShortStrategyRow(row: YieldLongShortStrategyCandidate): YieldLongShortStrategyTableRow {
	return {
		strategy: row.strategy,
		symbol: row.symbol,
		pool: row.pool,
		project: row.project,
		projectName: row.projectName,
		airdrop: row.airdrop,
		raiseValuation: row.raiseValuation,
		chains: row.chains ?? [row.chain],
		url: row.url ?? '',
		apy: row.apy,
		strikeTvl: row.strikeTvl,
		strategyAPY: row.strategyAPY,
		fr8hCurrent: row.fr8hCurrent,
		fundingRate7dAverage: row.fundingRate7dAverage,
		symbolPerp: row.symbolPerp,
		openInterest: row.openInterest,
		tvlUsd: row.tvlUsd,
		marketplace: row.marketplace,
		afr: row.afr,
		afr7d: row.afr7d,
		afr30d: row.afr30d,
		indexPrice: row.indexPrice
	}
}

export function buildYieldLongShortPageResponse({
	data,
	perps,
	query
}: {
	data: YieldPageData
	perps: YieldPerpMarket[]
	query: ParsedUrlQuery
}): YieldLongShortStrategyPageResponse {
	const token = typeof query.token === 'string' || Array.isArray(query.token) ? query : null
	const filteredPools = getLongShortFilteredPools(data)
	const decoded = decodeYieldsQuery(query, {
		projectList: data.props.projectList,
		chainList: data.props.chainList,
		categoryList: data.props.categoryList,
		evmChains: data.props.evmChains
	})
	const selectedChainsSet = new Set(decoded.selectedChains)
	const rows: YieldLongShortStrategyTableRow[] = []

	const positivePerps: YieldPerpMarket[] = []
	for (const market of perps) {
		if (market.fundingRate > 0) positivePerps.push(market)
	}

	const strategyPools = findStrategyPoolsFR({
		token,
		filteredPools,
		perps: positivePerps
	})

	for (const pool of strategyPools) {
		if (
			filterStrategyPool({
				pool,
				selectedChainsSet,
				selectedAttributes: decoded.selectedAttributes,
				minTvl: decoded.minTvl,
				maxTvl: decoded.maxTvl
			})
		) {
			rows.push(serializeLongShortStrategyRow(pool))
		}
	}

	return paginateAndSortRows<YieldLongShortStrategyTableRow, keyof YieldLongShortStrategyTableRow>({
		rows,
		query,
		sortAccessors: LONG_SHORT_SORT_ACCESSORS,
		defaultSort: LONG_SHORT_DEFAULT_SORT
	})
}
