import type { PaginationState, SortingState } from '@tanstack/react-table'
import { useRouter } from 'next/router'
import * as React from 'react'
import { EntityQuestionsStrip } from '~/components/EntityQuestionsStrip'
import { YIELD_POOLS_DATASET_API } from '~/constants'
import { useEntityQuestions } from '~/containers/LlamaAI/hooks/useEntityQuestions'
import { fetchJson } from '~/utils/async'
import { parseNumberQueryParam, pushShallowQuery, readSingleQueryValue, toQueryString } from '~/utils/routerQuery'
import { prepareYieldPoolsCsv } from '../domain/poolCsv'
import { getYieldViewFromPathname } from '../domain/views'
import { YieldFiltersV2 } from '../Filters'
import { ALL_POOL_COLUMN_QUERY_KEYS } from '../Filters/poolColumns'
import { getYieldsQuestionContext } from '../getYieldsQuestionContext'
import { useFormatYieldQueryParams } from '../hooks'
import type { YieldPoolsPageResponse } from '../pools.types'
import { buildPoolsTableRows } from '../poolsPipeline'
import { useHolderStats, useVolatility, useYieldPoolsPage } from '../queries.client'
import { PaginatedYieldsPoolTable, YieldsPoolsTable } from '../Tables/Pools'
import type { IYieldTableRow } from '../Tables/types'

const EMPTY_POOL_ROWS: IYieldTableRow[] = []
const DEFAULT_SERVER_PAGE_SIZE = 50

function parsePositiveIntegerQueryParam(value: string | string[] | undefined, fallback: number): number {
	const parsed = parseNumberQueryParam(value)
	return parsed != null && parsed > 0 ? Math.floor(parsed) : fallback
}

function getServerPaginationFromQuery(query: Record<string, string | string[] | undefined>): PaginationState {
	const page = parsePositiveIntegerQueryParam(query.page, 1)
	const pageSize = parsePositiveIntegerQueryParam(query.pageSize, DEFAULT_SERVER_PAGE_SIZE)
	return {
		pageIndex: page - 1,
		pageSize
	}
}

function getServerSortingFromQuery(query: Record<string, string | string[] | undefined>): SortingState {
	const sortBy = readSingleQueryValue(query.sortBy)
	if (!sortBy) return []

	return [
		{
			id: sortBy,
			desc: readSingleQueryValue(query.sortDesc) !== 'false'
		}
	]
}

function buildServerPoolsQueryString({
	query,
	view,
	pagination,
	sorting,
	pageSize
}: {
	query: Record<string, string | string[] | undefined>
	view: string
	pagination: PaginationState
	sorting: SortingState
	pageSize?: number | 'all'
}) {
	const sort = sorting[0]
	return toQueryString({
		...query,
		view,
		page: String(pagination.pageIndex + 1),
		pageSize: pageSize === 'all' ? 'all' : String(pageSize ?? pagination.pageSize),
		sortBy: sort?.id,
		sortDesc: sort ? String(sort.desc) : undefined
	})
}

const YieldPage = ({
	pools = [],
	projectList = [],
	chainList = [],
	categoryList = [],
	tokens = [],
	tokenSymbolsList = [],
	usdPeggedSymbols = [],
	tokenCategories = {},
	evmChains = [],
	stablecoinInfoBySymbol = {},
	entityQuestions: baseQuestions,
	header = 'Yield Rankings',
	serverPagination = false
}) => {
	const router = useRouter()
	const { pathname } = router
	const view = getYieldViewFromPathname(pathname)
	const query = router.query as Record<string, string | string[] | undefined>
	const pagination = React.useMemo(() => getServerPaginationFromQuery(query), [query])
	const sorting = React.useMemo(() => getServerSortingFromQuery(query), [query])

	const serverRowsQueryString = React.useMemo(() => {
		if (!serverPagination) return null

		return buildServerPoolsQueryString({
			query,
			view,
			pagination,
			sorting
		})
	}, [pagination, query, serverPagination, sorting, view])
	const serverRowsQuery = useYieldPoolsPage(serverRowsQueryString)
	const serverRows = serverRowsQuery.data?.rows ?? EMPTY_POOL_ROWS
	const serverTotal = serverRowsQuery.data?.total ?? 0

	const { data: volatility } = useVolatility()
	const { data: holderStats } = useHolderStats(serverPagination ? undefined : pools?.map((p) => p.pool))

	const {
		selectedProjects,
		selectedChains,
		selectedAttributes,
		includeTokens,
		excludeTokens, // Keep this since token matching is substring-based
		exactTokens,
		selectedCategories,
		pairTokens,
		minTvl,
		maxTvl,
		minApy,
		maxApy
	} = useFormatYieldQueryParams({ projectList, chainList, categoryList, evmChains })

	const filterContext = React.useMemo(() => getYieldsQuestionContext(router.query), [router.query])
	const { data: filteredQuestionsData, isFetching: isQuestionsLoading } = useEntityQuestions(
		'yields',
		'page',
		!!filterContext,
		filterContext ?? undefined
	)
	const questions = filteredQuestionsData?.questions?.length ? filteredQuestionsData.questions : baseQuestions

	const enrichRows = React.useCallback(
		(rows: IYieldTableRow[]) => {
			if (!volatility && !holderStats) return rows

			return rows.map((row) => {
				const poolId = row.configID
				const volatilityEntry = volatility?.[poolId]
				const holderStatsEntry = holderStats?.[poolId]

				return {
					...row,
					apyMedian30d: volatilityEntry?.[1] ?? row.apyMedian30d ?? null,
					apyStd30d: volatilityEntry?.[2] ?? row.apyStd30d ?? null,
					cv30d: volatilityEntry?.[3] ?? row.cv30d ?? null,
					holderCount: holderStatsEntry?.holderCount ?? row.holderCount ?? null,
					avgPositionUsd: holderStatsEntry?.avgPositionUsd ?? row.avgPositionUsd ?? null,
					top10Pct: holderStatsEntry?.top10Pct ?? row.top10Pct ?? null,
					holderChange7d: holderStatsEntry?.holderChange7d ?? row.holderChange7d ?? null,
					holderChange30d: holderStatsEntry?.holderChange30d ?? row.holderChange30d ?? null
				}
			})
		},
		[holderStats, volatility]
	)

	const legacyPoolsData = React.useMemo(() => {
		if (serverPagination) return []

		return buildPoolsTableRows({
			pools,
			view,
			filters: {
				selectedProjects,
				selectedChains,
				selectedAttributes,
				includeTokens,
				excludeTokens,
				exactTokens,
				selectedCategories,
				pairTokens,
				minTvl,
				maxTvl,
				minApy,
				maxApy
			},
			usdPeggedSymbols,
			tokenCategories,
			stablecoinInfoBySymbol,
			volatility,
			holderStats
		})
	}, [
		minTvl,
		maxTvl,
		minApy,
		maxApy,
		pools,
		selectedProjects,
		selectedCategories,
		selectedChains,
		selectedAttributes,
		includeTokens,
		excludeTokens,
		exactTokens,
		serverPagination,
		view,
		pairTokens,
		usdPeggedSymbols,
		tokenCategories,
		volatility,
		stablecoinInfoBySymbol,
		holderStats
	])
	const poolsData = React.useMemo(
		() => (serverPagination ? enrichRows(serverRows) : legacyPoolsData),
		[enrichRows, legacyPoolsData, serverPagination, serverRows]
	)
	const poolsNumber = serverPagination ? serverTotal : poolsData.length
	const prepareCsv = async () => {
		if (!serverPagination) return prepareYieldPoolsCsv(poolsData)

		const queryString = buildServerPoolsQueryString({
			query,
			view,
			pagination: { ...pagination, pageIndex: 0 },
			sorting,
			pageSize: 'all'
		})
		const csvData = await fetchJson<YieldPoolsPageResponse>(`${YIELD_POOLS_DATASET_API}${queryString}`)
		return prepareYieldPoolsCsv(enrichRows(csvData.rows))
	}

	const handlePaginationChange = React.useCallback(
		(nextPagination: PaginationState) => {
			void pushShallowQuery(router, {
				page: nextPagination.pageIndex > 0 ? String(nextPagination.pageIndex + 1) : undefined,
				pageSize: nextPagination.pageSize === DEFAULT_SERVER_PAGE_SIZE ? undefined : String(nextPagination.pageSize)
			})
		},
		[router]
	)

	const handleSortingChange = React.useCallback(
		(nextSorting: SortingState) => {
			const sort = nextSorting[0]
			void pushShallowQuery(router, {
				sortBy: sort?.id,
				sortDesc: sort ? String(sort.desc) : undefined,
				page: undefined
			})
		},
		[router]
	)

	return (
		<>
			<YieldFiltersV2
				header={header}
				poolsNumber={poolsNumber}
				projectsNumber={selectedProjects.length}
				chainsNumber={selectedChains.length}
				tokens={tokens}
				tokensList={tokenSymbolsList}
				selectedTokens={includeTokens}
				chainList={chainList}
				selectedChains={selectedChains}
				evmChains={evmChains}
				projectList={projectList}
				selectedProjects={selectedProjects}
				categoryList={categoryList}
				selectedCategories={selectedCategories}
				attributes={true}
				tvlRange={true}
				apyRange={true}
				enabledColumns={ALL_POOL_COLUMN_QUERY_KEYS}
				resetFilters={true}
				includeLsdApy={true}
				showMedianApy={true}
				showStdDev={true}
				prepareCsv={prepareCsv}
				showPresetFilters
			/>

			{questions?.length > 0 || isQuestionsLoading ? (
				<EntityQuestionsStrip
					questions={questions ?? []}
					entitySlug="yields"
					entityType="page"
					entityName="Yields"
					isLoading={isQuestionsLoading}
				/>
			) : null}

			{serverRowsQuery.isLoading && serverPagination && !serverRowsQuery.data ? (
				<p className="flex flex-1 items-center justify-center rounded-md border border-(--cards-border) bg-(--cards-bg) p-5">
					Loading pools...
				</p>
			) : poolsData.length > 0 ? (
				serverPagination ? (
					<PaginatedYieldsPoolTable
						data={poolsData}
						rowCount={serverTotal}
						manualPagination
						manualSorting
						serverMode
						paginationState={pagination}
						sortingState={sorting}
						onPaginationChange={handlePaginationChange}
						onSortingChange={handleSortingChange}
						interactionDisabled={serverRowsQuery.isFetching}
					/>
				) : (
					<YieldsPoolsTable data={poolsData} />
				)
			) : (
				<p className="flex flex-1 items-center justify-center rounded-md border border-(--cards-border) bg-(--cards-bg) p-5">
					Couldn't find any pools for these filters
				</p>
			)}
		</>
	)
}

export default YieldPage
