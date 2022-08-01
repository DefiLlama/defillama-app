import * as React from 'react'
import { useRouter } from 'next/router'
import styled from 'styled-components'
import {
	YieldAttributes,
	TVLRange,
	FiltersByChain,
	YieldProjects,
	ResetAllYieldFilters,
	attributeOptions
} from '~/components/Filters'
import { YieldsSearch } from '~/components/Search'
import dynamic from 'next/dynamic'
import { useFormatYieldQueryParams } from './hooks'

interface IChartProps {
	chartData: any
}

const ScatterChart = dynamic(() => import('~/components/TokenChart/ScatterChart'), {
	ssr: false
}) as React.FC<IChartProps>
const BoxplotChart = dynamic(() => import('~/components/TokenChart/BoxplotChart'), {
	ssr: false
}) as React.FC<IChartProps>
const TreemapChart = dynamic(() => import('~/components/TokenChart/TreemapChart'), {
	ssr: false
}) as React.FC<IChartProps>
const BarChartYields = dynamic(() => import('~/components/TokenChart/BarChartYields'), {
	ssr: false
}) as React.FC<IChartProps>

const PlotsPage = ({ pools, chainList, projectList, median }) => {
	const { query } = useRouter()
	const { minTvl, maxTvl } = query

	const { selectedProjects, selectedChains, selectedAttributes, includeTokens, excludeTokens } =
		useFormatYieldQueryParams({ projectList, chainList })

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

			if (isValidTvlRange) {
				toFilter = toFilter && (minTvl ? curr.tvlUsd > minTvl : true) && (maxTvl ? curr.tvlUsd < maxTvl : true)
			}

			if (toFilter) {
				return acc.concat(curr)
			} else return acc
		}, [])
	}, [minTvl, maxTvl, pools, selectedProjects, selectedChains, selectedAttributes, includeTokens, excludeTokens])

	return (
		<>
			<YieldsSearch step={{ category: 'Yields', name: 'All chains' }} pathname="/yields/overview" />

			<ChartFilters>
				<TableHeader>Yields Overview</TableHeader>
				<Dropdowns>
					<FiltersByChain chainList={chainList} selectedChains={selectedChains} pathname="/yields/overview" />
					<YieldProjects projectList={projectList} selectedProjects={selectedProjects} pathname="/yields/overview" />
					<YieldAttributes pathname="/yields/overview" />
					<TVLRange />
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
