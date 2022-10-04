import * as React from 'react'
import { useRouter } from 'next/router'
import styled from 'styled-components'
import {
	YieldAttributes,
	TVLRange,
	APYRange,
	FiltersByChain,
	YieldProjects,
	FiltersByCategory,
	ResetAllYieldFilters
} from '~/components/Filters'
import { YieldsSearch } from '~/components/Search'
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

const PlotsPage = ({ pools, chainList, projectList, categoryList, median }) => {
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
			<YieldsSearch step={{ category: 'Yields', name: 'All chains' }} pathname="/yields/overview" />

			<ChartFilters>
				<TableHeader>Yields Overview</TableHeader>
				<Dropdowns>
					<FiltersByChain chainList={chainList} selectedChains={selectedChains} pathname="/yields/overview" />
					<YieldProjects projectList={projectList} selectedProjects={selectedProjects} pathname="/yields/overview" />
					<FiltersByCategory
						categoryList={categoryList}
						selectedCategories={selectedCategories}
						pathname="/yields/overview"
					/>
					<YieldAttributes pathname="/yields/overview" />
					<TVLRange />
					<APYRange />
					<ResetAllYieldFilters pathname="/yields/overview" />
				</Dropdowns>
			</ChartFilters>

			<BarChartYields chartData={median} />
			<TreemapChart chartData={poolsData} />
			<ScatterChart chartData={poolsData.filter((p) => !p.outlier)} />
			<BoxplotChart chartData={poolsData.filter((p) => !p.outlier)} />
		</>
	)
}

const ChartFilters = styled.div`
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 20px;
	margin: 0 0 -18px;
`

const Dropdowns = styled.span`
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 20px;

	button {
		font-weight: 400;
	}
`

const TableHeader = styled.h1`
	margin: 0 auto 0 0;
	font-weight: 500;
	font-size: 1.125rem;
`

export default PlotsPage
