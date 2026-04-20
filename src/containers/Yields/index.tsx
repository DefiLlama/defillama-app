import { useRouter } from 'next/router'
import * as React from 'react'
import { EntityQuestionsStrip } from '~/components/EntityQuestionsStrip'
import { LocalLoader } from '~/components/Loaders'
import { useEntityQuestions } from '~/containers/LlamaAI/hooks/useEntityQuestions'
import { YieldFiltersV2 } from './Filters'
import { ALL_POOL_COLUMN_QUERY_KEYS } from './Filters/poolColumns'
import { getYieldsQuestionContext } from './getYieldsQuestionContext'
import { useFormatYieldQueryParams } from './hooks'
import { buildPoolsTableRows } from './poolsPipeline'
import { useHolderStats, useVolatility } from './queries/client'
import { YieldsPoolsTable } from './Tables/Pools'

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

	const [loading, setLoading] = React.useState(true)
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

	React.useEffect(() => {
		const timer = setTimeout(() => setLoading(false), 1000)
		return () => clearTimeout(timer)
	}, [])

	React.useEffect(() => {
		setLoading(true)
		const timer = setTimeout(() => setLoading(false), 500)
		return () => clearTimeout(timer)
	}, [
		minTvl,
		maxTvl,
		minApy,
		maxApy,
		selectedProjects,
		selectedCategories,
		selectedChains,
		selectedAttributes,
		includeTokens,
		excludeTokens,
		exactTokens,
		pathname,
		pairTokens
	])

	const poolsData = React.useMemo(() => {
		return buildPoolsTableRows({
			pools,
			pathname,
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
	const prepareCsv = () => {
		const headers = [
			'Pool',
			'Project',
			'Chain',
			'TVL',
			'APY',
			'APY Base',
			'APY Reward',
			'Change 1d',
			'Change 7d',
			'Outlook',
			'Confidence',
			'Category',
			'IL 7d',
			'APY Base 7d',
			'APY Net 7d',
			'APY Mean 30d',
			'Volume 1d',
			'Volume 7d',
			'APY Base Inception',
			'APY Including LSD APY',
			'APY Base Including LSD APY',
			'APY Base Borrow',
			'APY Reward Borrow',
			'APY Borrow',
			'Total Supply USD',
			'Total Borrow USD',
			'Total Available USD',
			'Pool Meta',
			'APY Median 30d',
			'APY Std Dev 30d',
			'CV 30d',
			'Holder Count',
			'Holders Avg Position USD',
			'Top 10 %',
			'Holder Change 7d',
			'Holder Change 30d'
		]
		const csvData = poolsData.map((row) => {
			return {
				Pool: row.pool,
				Project: row.project,
				Chain: row.chains?.join(', '),
				TVL: row.tvl,
				APY: row.apy,
				'APY Base': row.apyBase,
				'APY Reward': row.apyReward,
				'Change 1d': row.change1d,
				'Change 7d': row.change7d,
				Outlook: row.outlook,
				Confidence: row.confidence,
				Category: row.category,
				'IL 7d': row.il7d,
				'APY Base 7d': row.apyBase7d,
				'APY Net 7d': row.apyNet7d,
				'APY Mean 30d': row.apyMean30d,
				'Volume 1d': row.volumeUsd1d,
				'Volume 7d': row.volumeUsd7d,
				'APY Base Inception': row.apyBaseInception,
				'APY Including LSD APY': row.apyIncludingLsdApy,
				'APY Base Including LSD APY': row.apyBaseIncludingLsdApy,
				'APY Base Borrow': row.apyBaseBorrow,
				'APY Reward Borrow': row.apyRewardBorrow,
				'APY Borrow': row.apyBorrow,
				'Total Supply USD': row.totalSupplyUsd,
				'Total Borrow USD': row.totalBorrowUsd,
				'Total Available USD': row.totalAvailableUsd,
				'Pool Meta': row.poolMeta,
				'APY Median 30d': row.apyMedian30d,
				'APY Std Dev 30d': row.apyStd30d,
				'CV 30d': row.cv30d,
				'Holder Count': row.holderCount,
				'Holders Avg Position USD': row.avgPositionUsd,
				'Top 10 %': row.top10Pct,
				'Holder Change 7d': row.holderChange7d,
				'Holder Change 30d': row.holderChange30d
			}
		})

		return {
			filename: 'yields',
			rows: [headers].concat(csvData.map((row) => headers.map((h) => row[h])))
		}
	}

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

			{loading ? (
				<div className="m-auto flex min-h-[360px] items-center justify-center">
					<LocalLoader />
				</div>
			) : poolsData.length > 0 ? (
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
