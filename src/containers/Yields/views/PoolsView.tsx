import { useRouter } from 'next/router'
import * as React from 'react'
import { EntityQuestionsStrip } from '~/components/EntityQuestionsStrip'
import { useEntityQuestions } from '~/containers/LlamaAI/hooks/useEntityQuestions'
import { prepareYieldPoolsCsv } from '../domain/poolCsv'
import { getYieldViewFromPathname } from '../domain/views'
import { YieldFiltersV2 } from '../Filters'
import { ALL_POOL_COLUMN_QUERY_KEYS } from '../Filters/poolColumns'
import { getYieldsQuestionContext } from '../getYieldsQuestionContext'
import { useFormatYieldQueryParams } from '../hooks'
import { buildPoolsTableRows } from '../poolsPipeline'
import { useHolderStats, useVolatility } from '../queries.client'
import { YieldsPoolsTable } from '../Tables/Pools'

const YieldPage = ({
	pools,
	projectList,
	chainList,
	categoryList,
	tokens,
	tokenSymbolsList,
	usdPeggedSymbols,
	tokenCategories,
	evmChains,
	stablecoinInfoBySymbol,
	entityQuestions: baseQuestions,
	header = 'Yield Rankings'
}) => {
	const router = useRouter()
	const { pathname } = router

	const { data: volatility } = useVolatility()
	const { data: holderStats } = useHolderStats(pools?.map((p) => p.pool))

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

	const poolsData = React.useMemo(() => {
		return buildPoolsTableRows({
			pools,
			view: getYieldViewFromPathname(pathname),
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
		pathname,
		pairTokens,
		usdPeggedSymbols,
		tokenCategories,
		volatility,
		stablecoinInfoBySymbol,
		holderStats
	])
	const prepareCsv = () => prepareYieldPoolsCsv(poolsData)

	return (
		<>
			<YieldFiltersV2
				header={header}
				poolsNumber={poolsData.length}
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

			{poolsData.length > 0 ? (
				<YieldsPoolsTable data={poolsData} />
			) : (
				<p className="rounded-md border border-(--cards-border) bg-(--cards-bg) p-5 text-center">
					Couldn't find any pools for these filters
				</p>
			)}
		</>
	)
}

export default YieldPage
