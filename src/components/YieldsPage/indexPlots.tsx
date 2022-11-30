import * as React from 'react'
import { useRouter } from 'next/router'
import {
	YieldAttributes,
	TVLRange,
	APYRange,
	FiltersByChain,
	YieldProjects,
	FiltersByCategory,
	ResetAllYieldFilters,
	YieldFiltersV2,
	FiltersByToken
} from '~/components/Filters'
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

const PlotsPage = ({ pools, chainList, projectList, categoryList, median, tokens, tokenSymbolsList }) => {
	const { query, pathname } = useRouter()
	const { minTvl, maxTvl, minApy, maxApy } = query

	const { selectedProjects, selectedChains, selectedAttributes, includeTokens, excludeTokens, selectedCategories } =
		useFormatYieldQueryParams({ projectList, chainList, categoryList })

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
		selectedCategories,
		pathname
	])

	return (
		<>
			<YieldFiltersV2 header="Yields Overview" tokens={tokens}>
				<FiltersByToken
					tokensList={tokenSymbolsList}
					selectedTokens={includeTokens}
					pathname={pathname}
					variant="secondary"
				/>
				<FiltersByChain chainList={chainList} selectedChains={selectedChains} pathname={pathname} variant="secondary" />
				<YieldProjects
					projectList={projectList}
					selectedProjects={selectedProjects}
					pathname={pathname}
					variant="secondary"
				/>
				<FiltersByCategory
					categoryList={categoryList}
					selectedCategories={selectedCategories}
					pathname={pathname}
					variant="secondary"
				/>
				<YieldAttributes pathname={pathname} variant="secondary" />
				<TVLRange variant="secondary" />
				<APYRange variant="secondary" />
				<ResetAllYieldFilters pathname={pathname} variant="secondary" />
			</YieldFiltersV2>

			<BarChartYields chartData={median} />
			<TreemapChart chartData={poolsData} />
			<ScatterChart chartData={poolsData.filter((p) => !p.outlier)} />
			<BoxplotChart chartData={poolsData.filter((p) => !p.outlier)} />
		</>
	)
}

export default PlotsPage
