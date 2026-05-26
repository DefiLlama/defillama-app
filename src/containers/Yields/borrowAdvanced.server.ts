import type { ParsedUrlQuery } from 'querystring'
import type { IResponseCGMarketsAPI } from '~/api/coingecko.types'
import type { BorrowAdvancedPageMetadata, BorrowAdvancedRow, BorrowAdvancedSearchItem } from './borrowAdvanced'
import { UNBOUNDED_DEBT_CEILING_PROJECTS } from './constants'
import { filterPool, findOptimizerPools, formatOptimizerPool } from './domain/strategyFilters'
import type { LendBorrowData } from './queries.server'
import { decodeYieldsQuery } from './queryState'

const EMPTY_ARRAY: string[] = []
const LAST_SORT_POSITION = Number.MAX_SAFE_INTEGER

function getBorrowAdvancedMetadataLists(data: LendBorrowData) {
	return {
		chainList: data.props.chainList ?? EMPTY_ARRAY,
		lendingProtocols: data.props.lendingProtocols ?? EMPTY_ARRAY,
		evmChains: data.props.evmChains ?? EMPTY_ARRAY
	}
}

function getSingleQueryValue(value: ParsedUrlQuery[string]): string {
	return typeof value === 'string' ? value : ''
}

function getBorrowAdvancedPools(data: LendBorrowData) {
	const pools = data.props.pools ?? []
	const normalizedPools = []

	for (const pool of pools) {
		normalizedPools.push({ ...pool, symbol: pool.symbol.toUpperCase() })
	}

	return normalizedPools
}

function splitBorrowAdvancedPools(pools: ReturnType<typeof getBorrowAdvancedPools>) {
	const cdpPools = []
	const lendingPools = []

	for (const pool of pools) {
		if ((pool.category === 'CDP' && pool.mintedCoin) || (pool.category === 'Lending' && pool.mintedCoin)) {
			cdpPools.push({ ...pool, chains: [pool.chain], borrow: { ...pool, symbol: pool.mintedCoin.toUpperCase() } })
		} else if (pool.category !== 'CDP' && !pool.mintedCoin) {
			lendingPools.push(pool)
		}
	}

	return {
		cdpPools,
		lendingPools
	}
}

function serializeBorrowAdvancedRow(row): BorrowAdvancedRow {
	return {
		pool: row.pool,
		symbol: row.symbol,
		chain: row.chain,
		chains: row.chains ?? [row.chain],
		project: row.project,
		projectName: row.projectName,
		airdrop: row.airdrop,
		raiseValuation: row.raiseValuation,
		configID: row.configID ?? row.pool,
		url: row.url ?? '',
		underlyingTokens: row.underlyingTokens,
		exposure: row.exposure,
		ltv: row.ltv,
		strikeTvl: row.strikeTvl,
		rewardTokensNames: row.rewardTokensNames,
		rewardTokensSymbols: row.rewardTokensSymbols,
		borrow: {
			pool: row.borrow?.pool,
			symbol: row.borrow?.symbol,
			totalAvailableUsd: row.borrow?.totalAvailableUsd,
			underlyingTokens: row.borrow?.underlyingTokens
		},
		borrowAvailableUsd: row.borrowAvailableUsd,
		borrowBase: row.borrowBase,
		totalBase: row.totalBase,
		lendingBase: row.lendingBase,
		totalReward: row.totalReward,
		lendingReward: row.lendingReward,
		borrowReward: row.borrowReward,
		totalSupplyUsd: row.totalSupplyUsd,
		totalBorrowUsd: row.totalBorrowUsd
	}
}

export function buildBorrowAdvancedPageMetadata(
	data: LendBorrowData,
	cgList: Array<IResponseCGMarketsAPI>
): BorrowAdvancedPageMetadata {
	const cgPositions: Record<string, number> = {}
	for (let index = 0; index < cgList.length; index += 1) {
		cgPositions[cgList[index].symbol] = index
	}

	const symbols = [...(data.props.symbols ?? EMPTY_ARRAY)]
	symbols.sort((a, b) => (cgPositions[a] ?? LAST_SORT_POSITION) - (cgPositions[b] ?? LAST_SORT_POSITION))

	const seenSymbols = new Set<string>()
	const searchData: BorrowAdvancedSearchItem[] = []
	for (const rawSymbol of symbols) {
		const symbol = rawSymbol.replaceAll(/\(.*\)/g, '').trim()
		if (!symbol || seenSymbols.has(symbol)) continue
		seenSymbols.add(symbol)
		searchData.push({
			name: symbol,
			symbol,
			image: '',
			image2: ''
		})
	}

	return {
		...getBorrowAdvancedMetadataLists(data),
		searchData
	}
}

export function buildBorrowAdvancedPageRows(data: LendBorrowData, query: ParsedUrlQuery) {
	const lend = getSingleQueryValue(query.lend)
	const borrow = getSingleQueryValue(query.borrow)
	if (!lend || !borrow) return []

	const metadata = getBorrowAdvancedMetadataLists(data)
	const { selectedChains, selectedAttributes, selectedLendingProtocols, customLTV, minAvailable, maxAvailable } =
		decodeYieldsQuery(query, {
			chainList: metadata.chainList,
			lendingProtocols: metadata.lendingProtocols,
			evmChains: metadata.evmChains
		})

	const { cdpPools, lendingPools } = splitBorrowAdvancedPools(getBorrowAdvancedPools(data))
	const selectedChainsSet = new Set(selectedChains)
	const selectedLendingProtocolsSet = selectedLendingProtocols ? new Set(selectedLendingProtocols) : null
	const unlimitedDebtProjects = new Set<string>(UNBOUNDED_DEBT_CEILING_PROJECTS)
	const rows = []

	const optimizerPools = findOptimizerPools({
		pools: lendingPools,
		tokenToLend: lend,
		tokenToBorrow: borrow,
		cdpRoutes: cdpPools
	})

	for (const pool of optimizerPools) {
		if (lend.toLowerCase() === 'eth' && pool.symbol?.toLowerCase().includes('steth')) continue
		if (borrow.toLowerCase() === 'eth' && pool.borrow?.symbol?.toLowerCase().includes('steth')) continue

		const poolProject = pool.project
		const borrowProject = pool.borrow?.project
		const hasUnboundedDebtCeiling =
			(poolProject && unlimitedDebtProjects.has(poolProject)) ||
			(borrowProject && unlimitedDebtProjects.has(borrowProject))
		const poolForFilter =
			hasUnboundedDebtCeiling && pool.borrow && pool.borrow.totalAvailableUsd == null
				? {
						...pool,
						borrow: { ...pool.borrow, totalAvailableUsd: Number.POSITIVE_INFINITY }
					}
				: pool

		if (
			!filterPool({
				pool: poolForFilter,
				selectedChainsSet,
				selectedAttributes,
				minAvailable,
				maxAvailable,
				selectedLendingProtocolsSet,
				customLTV
			})
		) {
			continue
		}

		rows.push(formatOptimizerPool({ pool, customLTV }))
	}

	rows.sort((a, b) => b.totalReward - a.totalReward)

	const compactRows: BorrowAdvancedRow[] = []
	for (const row of rows) {
		compactRows.push(serializeBorrowAdvancedRow(row))
	}
	return compactRows
}
