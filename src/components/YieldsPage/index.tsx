import * as React from 'react'
import { useRouter } from 'next/router'
import styled from 'styled-components'
import { Panel } from '~/components'
import { NameYield } from '~/components/Table'
import { YieldAttributes, TVLRange, FiltersByChain } from '~/components/Filters'
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

const YieldPage = ({ pools, chainList }) => {
	const chain = [...new Set(pools.map((el) => el.chain))]
	const selectedTab = chain.length > 1 ? 'All' : chain[0]
	const [chainsToFilter, setChainsToFilter] = React.useState<string[]>(chainList)
	const [tokensToFilter, setTokensToFilter] = React.useState<ITokensToIncludeAndExclude>({
		includeTokens: [],
		excludeTokens: []
	})

	const { query } = useRouter()
	const { minTvl, maxTvl } = query

	// if route query contains 'project' remove project href
	const idx = columns.findIndex((c) => c.accessor === 'project')

	if (query.project) {
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
		const data = pools.filter((p) => {
			let toFilter = true

			if (stablecoins) {
				toFilter = toFilter && p.stablecoin === true
			}

			if (noIL) {
				toFilter = toFilter && p.ilRisk === 'no'
			}

			if (singleExposure) {
				toFilter = toFilter && p.exposure === 'single'
			}

			if (millionDollar) {
				toFilter = toFilter && p.tvlUsd >= 1e6
			}

			if (audited) {
				toFilter = toFilter && p.audits !== '0'
			}

			const tokensInPool = p.symbol.split('-').map((x) => x.toLowerCase())

			const includeToken =
				tokensToFilter.includeTokens.length > 0
					? tokensToFilter.includeTokens.find((token) => tokensInPool.includes(token))
					: true

			const excludeToken = !tokensToFilter.excludeTokens.find((token) => tokensInPool.includes(token))

			return toFilter && chainsToFilter.includes(p.chain) && includeToken && excludeToken
		})

		const poolsData = data.map((t) => ({
			id: t.pool,
			pool: t.symbol,
			projectslug: t.project,
			project: t.projectName,
			chains: [t.chain],
			tvl: t.tvlUsd,
			apy: t.apy,
			change1d: t.apyPct1D,
			change7d: t.apyPct7D,
			outlook: t.predictions.predictedClass,
			confidence: t.predictions.binnedConfidence
		}))

		const isValidTvlRange =
			(minTvl !== undefined && !Number.isNaN(Number(minTvl))) || (maxTvl !== undefined && !Number.isNaN(Number(maxTvl)))

		return isValidTvlRange
			? poolsData.filter((p) => (minTvl ? p.tvl > minTvl : true) && (maxTvl ? p.tvl < maxTvl : true))
			: poolsData
	}, [minTvl, maxTvl, pools, chainsToFilter, audited, millionDollar, noIL, singleExposure, stablecoins, tokensToFilter])

	let stepName = undefined
	if (query.chain) stepName = selectedTab
	else if (query.project) stepName = poolsData[0]?.project ?? capitalizeFirstLetter(query.project)

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
