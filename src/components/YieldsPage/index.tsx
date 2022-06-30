import * as React from 'react'
import { useRouter } from 'next/router'
import styled from 'styled-components'
import { Panel } from '~/components'
import { NameYield } from '~/components/Table'
import { YieldAttributes, TVLRange, FiltersByChain, YieldProjects } from '~/components/Filters'
import { YieldsSearch } from '~/components/Search'
import {
	useNoILManager,
	useSingleExposureManager,
	useStablecoinsManager,
	useMillionDollarManager,
	useAuditedManager
} from '~/contexts/LocalStorage'
import { capitalizeFirstLetter } from '~/utils'
import { columns, TableWrapper } from './shared'

interface ITokensToIncludeAndExclude {
	includeTokens: string[]
	excludeTokens: string[]
}

const YieldPage = ({ pools, chainList, projectNameList }) => {
	const selectedTab = chainList.length > 1 ? 'All' : chainList[0]
	const [chainsToFilter, setChainsToFilter] = React.useState<string[]>(chainList)
	const [tokensToFilter, setTokensToFilter] = React.useState<ITokensToIncludeAndExclude>({
		includeTokens: [],
		excludeTokens: []
	})

	const { query } = useRouter()
	const { minTvl, maxTvl, project } = query

	const selectedProjects = React.useMemo(
		() => (project ? (typeof project === 'string' ? [project] : project) : []),
		[project]
	)

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

			if (selectedProjects.length > 0) {
				toFilter = toFilter && selectedProjects.includes(curr.projectName)
			}

			const tokensInPool = curr.symbol.split('-').map((x) => x.toLowerCase())

			const includeToken =
				tokensToFilter.includeTokens.length > 0
					? tokensToFilter.includeTokens.find((token) => tokensInPool.includes(token))
					: true

			const excludeToken = !tokensToFilter.excludeTokens.find((token) => tokensInPool.includes(token))

			toFilter = toFilter && chainsToFilter.includes(curr.chain) && includeToken && excludeToken

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
		chainsToFilter,
		audited,
		millionDollar,
		noIL,
		singleExposure,
		stablecoins,
		tokensToFilter,
		selectedProjects
	])

	let stepName = undefined
	if (query.chain) stepName = selectedTab
	else if (query.projectName) stepName = poolsData[0]?.project ?? capitalizeFirstLetter(query.projectName)

	return (
		<>
			<YieldsSearch
				step={{ category: 'Yields', name: stepName ?? 'All chains' }}
				setTokensToFilter={setTokensToFilter}
			/>

			<TableFilters>
				<TableHeader>Yield Rankings</TableHeader>
				<Dropdowns>
					<FiltersByChain chains={chainList} setChainsToFilter={setChainsToFilter} />
					<YieldProjects projectNameList={projectNameList} selectedProjects={selectedProjects} />
					<YieldAttributes />
					<TVLRange />
				</Dropdowns>
			</TableFilters>

			{poolsData.length > 0 ? (
				<TableWrapper data={poolsData} columns={columns} />
			) : (
				<Panel as="p" style={{ margin: 0, textAlign: 'center' }}>
					{stepName ? `${stepName} has no pools listed` : "Couldn't find any pools for these filters"}
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

	button {
		font-weight: 400;
	}
`

const TableHeader = styled.h1`
	margin: 0 auto 0 0;
	font-weight: 500;
	font-size: 1.125rem;
`

export default YieldPage
