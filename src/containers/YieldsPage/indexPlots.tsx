import * as React from 'react'
import { useRouter } from 'next/router'
import { YieldFiltersV2 } from '~/components/Filters/yields'
import dynamic from 'next/dynamic'
import { useFormatYieldQueryParams } from './hooks'
import { toFilterPool } from './utils'

interface IChartProps {
	chartData: any
}

const ScatterChart = dynamic(() => import('~/components/ECharts/ScatterChart'), {
	ssr: false
}) as React.FC<IChartProps>
const BoxplotChart = dynamic(() => import('~/components/ECharts/BoxplotChart'), {
	ssr: false
}) as React.FC<IChartProps>
const TreemapChart = dynamic(() => import('~/components/ECharts/TreemapChart'), {
	ssr: false
}) as React.FC<IChartProps>
const BarChartYields = dynamic(() => import('~/components/ECharts/BarChart/Yields'), {
	ssr: false
}) as React.FC<IChartProps>

export const PlotsPage = ({ pools, chainList, projectList, categoryList, median, tokens, tokenSymbolsList }) => {
	const { query, pathname } = useRouter()
	const { minTvl, maxTvl, minApy, maxApy } = query

	const {
		selectedProjects,
		selectedChains,
		selectedAttributes,
		includeTokens,
		excludeTokens,
		exactTokens,
		selectedCategories
	} = useFormatYieldQueryParams({ projectList, chainList, categoryList })

	const poolsData = React.useMemo(() => {
		return pools.reduce((acc, curr) => {
			const toFilter = toFilterPool({
				curr,
				pathname,
				selectedProjects,
				selectedChains,
				selectedAttributes,
				includeTokens,
				excludeTokens,
				exactTokens,
				selectedCategories,
				minTvl,
				maxTvl,
				minApy,
				maxApy
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
		pathname
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

			<BarChartYields chartData={median} />
			<TreemapChart chartData={poolsData} />
			<ScatterChart chartData={poolsData.filter((p) => !p.outlier)} />
			<BoxplotChart chartData={poolsData.filter((p) => !p.outlier)} />
		</>
	)
}
