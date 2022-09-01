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
	ResetAllYieldFilters,
	attributeOptions
} from '~/components/Filters'
import { YieldsSearch } from '~/components/Search'
import dynamic from 'next/dynamic'
import { useFormatYieldQueryParams } from './hooks'

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
	const { query } = useRouter()
	const { minTvl, maxTvl, minApy, maxApy } = query

	const { selectedProjects, selectedChains, selectedAttributes, includeTokens, excludeTokens, selectedCategories } =
		useFormatYieldQueryParams({ projectList, chainList, categoryList })

	const poolsData = React.useMemo(() => {
		return pools.reduce((acc, curr) => {
			let toFilter = true

			selectedAttributes.forEach((attribute) => {
				const attributeOption = attributeOptions.find((o) => o.key === attribute)

				if (attributeOption) {
					toFilter = toFilter && attributeOption.filterFn(curr)
				}
			})

			if (selectedProjects.length > 0) {
				toFilter = toFilter && selectedProjects.map((p) => p.toLowerCase()).includes(curr.project.toLowerCase())
			}

			if (selectedCategories.length > 0) {
				toFilter = toFilter && selectedCategories.map((p) => p.toLowerCase()).includes(curr.category.toLowerCase())
			}

			const tokensInPool = curr.symbol.split('-').map((x) => x.toLowerCase())

			const includeToken =
				includeTokens.length > 0
					? includeTokens.map((t) => t.toLowerCase()).find((token) => tokensInPool.includes(token.toLowerCase()))
					: true

			const excludeToken = !excludeTokens
				.map((t) => t.toLowerCase())
				.find((token) => tokensInPool.includes(token.toLowerCase()))

			toFilter =
				toFilter &&
				selectedChains.map((t) => t.toLowerCase()).includes(curr.chain.toLowerCase()) &&
				includeToken &&
				excludeToken

			const isValidTvlRange =
				(minTvl !== undefined && !Number.isNaN(Number(minTvl))) ||
				(maxTvl !== undefined && !Number.isNaN(Number(maxTvl)))

			const isValidApyRange =
				(minApy !== undefined && !Number.isNaN(Number(minApy))) ||
				(maxApy !== undefined && !Number.isNaN(Number(maxApy)))

			if (isValidTvlRange) {
				toFilter = toFilter && (minTvl ? curr.tvlUsd > minTvl : true) && (maxTvl ? curr.tvlUsd < maxTvl : true)
			}

			if (isValidApyRange) {
				toFilter = toFilter && (minApy ? curr.apy > minApy : true) && (maxApy ? curr.apy < maxApy : true)
			}

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
		selectedCategories
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
