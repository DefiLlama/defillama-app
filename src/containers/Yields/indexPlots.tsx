import * as React from 'react'
import { useRouter } from 'next/router'
import { YieldFiltersV2 } from './Filters'
import { useFormatYieldQueryParams } from './hooks'
import { toFilterPool } from './utils'

interface IChartProps {
	chartData: any
}

const ScatterChart = React.lazy(() => import('~/components/ECharts/ScatterChart')) as React.FC<IChartProps>
const BoxplotChart = React.lazy(() => import('~/components/ECharts/BoxplotChart')) as React.FC<IChartProps>
const TreemapChart = React.lazy(() => import('~/components/ECharts/TreemapChart')) as React.FC<IChartProps>
const BarChartYields = React.lazy(() => import('~/components/ECharts/BarChart/Yields')) as React.FC<IChartProps>

export const PlotsPage = ({
	pools,
	chainList,
	projectList,
	categoryList,
	median,
	tokens,
	tokenSymbolsList,
	usdPeggedSymbols
}) => {
	const { query, pathname } = useRouter()
	const { minTvl, maxTvl, minApy, maxApy } = query

	const {
		selectedProjects,
		selectedChains,
		selectedAttributes,
		includeTokens,
		excludeTokens,
		exactTokens,
		selectedCategories,
		pairTokens
	} = useFormatYieldQueryParams({ projectList, chainList, categoryList })

	const poolsData = React.useMemo(() => {
		const pair_tokens = pairTokens.map((token) => token.toLowerCase())
		const include_tokens = includeTokens.map((token) => token.toLowerCase())
		const exclude_tokens = excludeTokens.map((token) => token.toLowerCase())
		const exact_tokens = exactTokens.map((token) => token.toLowerCase())

		return pools.reduce((acc, curr) => {
			const toFilter = toFilterPool({
				curr,
				pathname,
				selectedProjects,
				selectedChains,
				selectedAttributes,
				includeTokens: include_tokens,
				excludeTokens: exclude_tokens,
				exactTokens: exact_tokens,
				selectedCategories,
				minTvl,
				maxTvl,
				minApy,
				maxApy,
				pairTokens: pair_tokens,
				usdPeggedSymbols
			})

			if (toFilter) {
				return acc.concat(curr)
			} else return acc
		}, [])
	}, [
		minTvl,
		maxTvl,
		minApy,
		maxApy,
		pools,
		selectedProjects,
		selectedChains,
		selectedAttributes,
		includeTokens,
		excludeTokens,
		exactTokens,
		selectedCategories,
		pathname,
		pairTokens
	])

	return (
		<>
			<YieldFiltersV2
				header="Yields Overview"
				tokens={tokens}
				tokensList={tokenSymbolsList}
				selectedTokens={includeTokens}
				chainList={chainList}
				selectedChains={selectedChains}
				projectList={projectList}
				selectedProjects={selectedProjects}
				categoryList={categoryList}
				selectedCategories={selectedCategories}
				attributes={true}
				tvlRange={true}
				apyRange={true}
				resetFilters={true}
			/>

			<React.Suspense fallback={<></>}>
				<BarChartYields chartData={median} />
			</React.Suspense>
			<React.Suspense fallback={<></>}>
				<TreemapChart chartData={poolsData} />
			</React.Suspense>
			<React.Suspense fallback={<></>}>
				<ScatterChart chartData={poolsData.filter((p) => !p.outlier)} />
			</React.Suspense>
			<React.Suspense fallback={<></>}>
				<BoxplotChart chartData={poolsData.filter((p) => !p.outlier)} />
			</React.Suspense>
		</>
	)
}
