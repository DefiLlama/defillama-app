import * as React from 'react'
import { useRouter } from 'next/router'
import styled from 'styled-components'
import { YieldAttributes, TVLRange, FiltersByChain, YieldProjects, ResetAllYieldFilters } from '~/components/Filters'
import { YieldsSearch } from '~/components/Search'
import { useSettingsManager } from '~/contexts/LocalStorage'
import dynamic from 'next/dynamic'
import { extraYieldSettings } from '../Settings'

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

const PlotsPage = ({ pools, chainList, projectList }) => {
	const { query } = useRouter()
	const { minTvl, maxTvl, project, chain, token, excludeToken } = query

	const { selectedProjects, selectedChains, includeTokens, excludeTokens } = React.useMemo(() => {
		let selectedProjects = [],
			selectedChains = [],
			includeTokens = [],
			excludeTokens = []

		if (project) {
			if (typeof project === 'string') {
				selectedProjects = project === 'All' ? projectList.map((p) => p.slug) : [project]
			} else {
				selectedProjects = [...project]
			}
		}

		if (chain) {
			if (typeof chain === 'string') {
				selectedChains = chain === 'All' ? [...chainList] : [chain]
			} else {
				selectedChains = [...chain]
			}
		} else selectedChains = [...chainList]

		if (token) {
			if (typeof token === 'string') {
				includeTokens = [token]
			} else {
				includeTokens = [...token]
			}
		}

		if (excludeToken) {
			if (typeof excludeToken === 'string') {
				excludeTokens = [excludeToken]
			} else {
				excludeTokens = [...excludeToken]
			}
		}

		return {
			selectedProjects,
			selectedChains,
			includeTokens,
			excludeTokens
		}
	}, [project, chain, projectList, chainList, token, excludeToken])

	const { STABLECOINS, NO_IL, SINGLE_EXPOSURE, MILLION_DOLLAR, AUDITED, NO_OUTLIER, APY_GT0 } =
		useSettingsManager(extraYieldSettings)

	const poolsData = React.useMemo(() => {
		return pools.reduce((acc, curr) => {
			let toFilter = true

			if (STABLECOINS) {
				toFilter = toFilter && curr.stablecoin === true
			}

			if (NO_IL) {
				toFilter = toFilter && curr.ilRisk === 'no'
			}

			if (SINGLE_EXPOSURE) {
				toFilter = toFilter && curr.exposure === 'single'
			}

			if (MILLION_DOLLAR) {
				toFilter = toFilter && curr.tvlUsd >= 1e6
			}

			if (AUDITED) {
				toFilter = toFilter && curr.audits !== '0'
			}

			if (NO_OUTLIER) {
				toFilter = toFilter && curr.outlier === false
			}

			if (APY_GT0) {
				toFilter = toFilter && curr.apy > 0
			}

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
	}, [
		minTvl,
		maxTvl,
		pools,
		AUDITED,
		NO_OUTLIER,
		APY_GT0,
		MILLION_DOLLAR,
		NO_IL,
		SINGLE_EXPOSURE,
		STABLECOINS,
		selectedProjects,
		selectedChains,
		includeTokens,
		excludeTokens
	])

	return (
		<>
			<YieldsSearch step={{ category: 'Yields', name: 'All chains' }} pathname="/yields/overview" />

			<ChartFilters>
				<TableHeader>Yields Overview</TableHeader>
				<Dropdowns>
					<FiltersByChain chainList={chainList} selectedChains={selectedChains} pathname="/yields/overview" />
					<YieldProjects projectList={projectList} selectedProjects={selectedProjects} pathname="/yields/overview" />
					<YieldAttributes />
					<TVLRange />
					<ResetAllYieldFilters pathname="/yields/overview" />
				</Dropdowns>
			</ChartFilters>

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
