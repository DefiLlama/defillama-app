import * as React from 'react'
import { useRouter } from 'next/router'
import styled from 'styled-components'
import { Panel } from '~/components'
import { NameYield } from '~/components/Table'
import { YieldAttributes, TVLRange, FiltersByChain, YieldProjects, ResetAllYieldFilters } from '~/components/Filters'
import { YieldsSearch } from '~/components/Search'
import {
	useNoILManager,
	useSingleExposureManager,
	useStablecoinsManager,
	useMillionDollarManager,
	useAuditedManager,
	useNoOutlierManager,
	useAPYManager
} from '~/contexts/LocalStorage'
import { columns, TableWrapper } from './shared'

const YieldPage = ({ pools, chainList, projectList }) => {
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

	// if route query contains 'project' remove project href
	const idx = columns.findIndex((c) => c.accessor === 'project')

	if (query.projectName) {
		columns[idx] = {
			header: 'Project',
			accessor: 'project',
			disableSortBy: true,
			Cell: ({ value, rowValues }) => (
				<NameYield value={value} project={rowValues.project} projectslug={rowValues.projectslug} rowType="accordion" />
			)
		}
	} else {
		columns[idx] = {
			header: 'Project',
			accessor: 'project',
			disableSortBy: true,
			Cell: ({ value, rowValues }) => (
				<NameYield value={value} project={rowValues.project} projectslug={rowValues.projectslug} />
			)
		}
	}

	// toggles
	const [stablecoins] = useStablecoinsManager()
	const [noIL] = useNoILManager()
	const [singleExposure] = useSingleExposureManager()
	const [millionDollar] = useMillionDollarManager()
	const [audited] = useAuditedManager()
	const [noOutlier] = useNoOutlierManager()
	const [apyGT0] = useAPYManager()

	const poolsData = React.useMemo(() => {
		return pools.reduce((acc, curr) => {
			let toFilter = true

			if (stablecoins) {
				toFilter = toFilter && curr.stablecoin === true
			}

			if (noIL) {
				toFilter = toFilter && curr.ilRisk === 'no'
			}

			if (singleExposure) {
				toFilter = toFilter && curr.exposure === 'single'
			}

			if (millionDollar) {
				toFilter = toFilter && curr.tvlUsd >= 1e6
			}

			if (audited) {
				toFilter = toFilter && curr.audits !== '0'
			}

			if (noOutlier) {
				toFilter = toFilter && curr.outlier === false
			}

			if (apyGT0) {
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
				return acc.concat({
					id: curr.pool,
					pool: curr.symbol,
					projectslug: curr.project,
					project: curr.projectName,
					chains: [curr.chain],
					tvl: curr.tvlUsd,
					apy: curr.apy,
					change1d: curr.apyPct1D,
					change7d: curr.apyPct7D,
					outlook: curr.predictions.predictedClass,
					confidence: curr.predictions.binnedConfidence
				})
			} else return acc
		}, [])
	}, [
		minTvl,
		maxTvl,
		pools,
		audited,
		noOutlier,
		apyGT0,
		millionDollar,
		noIL,
		singleExposure,
		stablecoins,
		selectedProjects,
		selectedChains,
		includeTokens,
		excludeTokens
	])

	return (
		<>
			<YieldsSearch step={{ category: 'Home', name: 'Yields' }} pathname="/yields" />

			<TableFilters>
				<TableHeader>Yield Rankings</TableHeader>
				<Dropdowns>
					<FiltersByChain chainList={chainList} selectedChains={selectedChains} pathname="/yields" />
					<YieldProjects projectList={projectList} selectedProjects={selectedProjects} pathname="/yields" />
					<YieldAttributes />
					<TVLRange />
					<ResetAllYieldFilters pathname="/yields" />
				</Dropdowns>
			</TableFilters>

			{poolsData.length > 0 ? (
				<TableWrapper data={poolsData} columns={columns} />
			) : (
				<Panel as="p" style={{ margin: 0, textAlign: 'center' }}>
					Couldn't find any pools for these filters
				</Panel>
			)}
		</>
	)
}

const TableFilters = styled.div`
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 20px;
	margin: 0 0 -20px;
`

const Dropdowns = styled.span`
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 20px;
`

const TableHeader = styled.h1`
	margin: 0 auto 0 0;
	font-weight: 500;
	font-size: 1.125rem;
`

export default YieldPage
