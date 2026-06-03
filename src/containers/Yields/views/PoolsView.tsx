import { useRouter } from 'next/router'
import * as React from 'react'
import { EntityQuestionsStrip } from '~/components/EntityQuestionsStrip'
import { NewsletterSignup } from '~/components/Newsletter/NewsletterSignup'
import { YIELD_POOLS_DATASET_API } from '~/constants'
import { useEntityQuestions } from '~/containers/LlamaAI/hooks/useEntityQuestions'
import { fetchJson } from '~/utils/async'
import { prepareYieldPoolsCsv } from '../domain/poolCsv'
import { getYieldViewFromPathname } from '../domain/views'
import { YieldFiltersV2 } from '../Filters'
import { ALL_POOL_COLUMN_QUERY_KEYS } from '../Filters/poolColumns'
import { getYieldsQuestionContext } from '../getYieldsQuestionContext'
import { useFormatYieldQueryParams } from '../hooks'
import type { YieldPoolsPageResponse } from '../pools.types'
import { buildPoolsTableRows } from '../poolsPipeline'
import { useHolderStats, useVolatility } from '../queries.client'
import { PaginatedYieldsPoolTable, YieldsPoolsTable } from '../Tables/Pools'
import type { IYieldTableRow } from '../Tables/types'
import { useYieldsServerTable } from '../useYieldsServerTable'

const EMPTY_POOL_ROWS: IYieldTableRow[] = []

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
	serverPagination = false,
	serverApi = YIELD_POOLS_DATASET_API
}) => {
	const router = useRouter()
	const { pathname } = router
	const view = getYieldViewFromPathname(pathname)
	const {
		rows: serverRows,
		total: serverTotal,
		rowsQuery: serverRowsQuery,
		tableProps: serverTableProps,
		buildAllRowsQueryString
	} = useYieldsServerTable<IYieldTableRow>({
		endpoint: serverApi,
		enabled: serverPagination,
		extraQuery: { view }
	})
	const effectiveServerRows = serverRows.length > 0 ? serverRows : EMPTY_POOL_ROWS

	const { data: volatility } = useVolatility()
	const holderStatsPoolIds = React.useMemo(() => {
		if (serverPagination) return undefined
		const ids: string[] = []
		for (const pool of pools ?? []) {
			ids.push(pool.pool)
		}
		return ids
	}, [pools, serverPagination])
	const { data: holderStats } = useHolderStats(holderStatsPoolIds)

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

			const enrichedRows: IYieldTableRow[] = []
			for (const row of rows) {
				const poolId = row.configID
				const volatilityEntry = volatility?.[poolId]
				const holderStatsEntry = holderStats?.[poolId]

				enrichedRows.push({
					...row,
					apyMedian30d: volatilityEntry?.[1] ?? row.apyMedian30d ?? null,
					apyStd30d: volatilityEntry?.[2] ?? row.apyStd30d ?? null,
					cv30d: volatilityEntry?.[3] ?? row.cv30d ?? null,
					holderCount: holderStatsEntry?.holderCount ?? row.holderCount ?? null,
					avgPositionUsd: holderStatsEntry?.avgPositionUsd ?? row.avgPositionUsd ?? null,
					top10Pct: holderStatsEntry?.top10Pct ?? row.top10Pct ?? null,
					holderChange7d: holderStatsEntry?.holderChange7d ?? row.holderChange7d ?? null,
					holderChange30d: holderStatsEntry?.holderChange30d ?? row.holderChange30d ?? null
				})
			}
			return enrichedRows
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
		() => (serverPagination ? enrichRows(effectiveServerRows) : legacyPoolsData),
		[effectiveServerRows, enrichRows, legacyPoolsData, serverPagination]
	)
	const poolsNumber = serverPagination ? serverTotal : poolsData.length
	const prepareCsv = async () => {
		if (!serverPagination) return prepareYieldPoolsCsv(poolsData)

		const csvData = await fetchJson<YieldPoolsPageResponse>(`${serverApi}${buildAllRowsQueryString()}`)
		return prepareYieldPoolsCsv(enrichRows(csvData.rows))
	}

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

			<NewsletterSignup layout="strip" />

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
			) : serverPagination && serverRowsQuery.isError && !serverRowsQuery.data ? (
				<p className="flex flex-1 items-center justify-center rounded-md border border-(--cards-border) bg-(--cards-bg) p-5">
					Couldn't load pools.
				</p>
			) : poolsData.length > 0 ? (
				serverPagination ? (
					<PaginatedYieldsPoolTable data={poolsData} serverMode {...serverTableProps} />
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
