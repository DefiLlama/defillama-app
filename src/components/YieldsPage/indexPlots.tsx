import * as React from 'react'
import { useRouter } from 'next/router'
import styled from 'styled-components'
import { YieldAttributes, TVLRange, FiltersByChain } from '~/components/Filters'
import { YieldsSearch } from '~/components/Search'
import {
	useNoILManager,
	useSingleExposureManager,
	useStablecoinsManager,
	useMillionDollarManager,
	useAuditedManager
} from '~/contexts/LocalStorage'
import dynamic from 'next/dynamic'

interface ITokensToIncludeAndExclude {
	includeTokens: string[]
	excludeTokens: string[]
}

interface IChartProps {
	chartData: any
}

const ScatterChart = dynamic(() => import('~/components/TokenChart/ScatterChart'), {
	ssr: false
}) as React.FC<IChartProps>

const PlotsPage = ({ pools, chainList }) => {
	const [chainsToFilter, setChainsToFilter] = React.useState<string[]>(chainList)
	const [tokensToFilter, setTokensToFilter] = React.useState<ITokensToIncludeAndExclude>({
		includeTokens: [],
		excludeTokens: []
	})

	const { query } = useRouter()
	const { minTvl, maxTvl } = query

	// toggles
	const [stablecoins] = useStablecoinsManager()
	const [noIL] = useNoILManager()
	const [singleExposure] = useSingleExposureManager()
	const [millionDollar] = useMillionDollarManager()
	const [audited] = useAuditedManager()

	const data = React.useMemo(() => {
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

		const isValidTvlRange =
			(minTvl !== undefined && !Number.isNaN(Number(minTvl))) || (maxTvl !== undefined && !Number.isNaN(Number(maxTvl)))

		return isValidTvlRange
			? data.filter((p) => (minTvl ? p.tvlUsd > minTvl : true) && (maxTvl ? p.tvlUsd < maxTvl : true))
			: data
	}, [minTvl, maxTvl, pools, chainsToFilter, audited, millionDollar, noIL, singleExposure, stablecoins, tokensToFilter])

	return (
		<>
			<YieldsSearch step={{ category: 'Yields', name: 'All chains' }} setTokensToFilter={setTokensToFilter} />

			<TableFilters>
				<TableHeader>Yield Plots</TableHeader>
				<Dropdowns>
					<FiltersByChain chains={chainList} setChainsToFilter={setChainsToFilter} />
					<YieldAttributes />
					<TVLRange />
				</Dropdowns>
			</TableFilters>
			<ScatterChart chartData={data}></ScatterChart>
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

export default PlotsPage
