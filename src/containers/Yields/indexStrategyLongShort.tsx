import { useRouter } from 'next/router'
import * as React from 'react'
import { YieldFiltersV2 } from './Filters'
import { useFormatYieldQueryParams } from './hooks'
import { YieldsStrategyTableFR } from './Tables/StrategyFR'
import { filterPool, findStrategyPoolsFR } from './utils'

const YieldsStrategyPageLongShort = ({
	filteredPools,
	perps,
	tokens,
	projectList,
	chainList,
	categoryList,
	evmChains
}) => {
	const { query } = useRouter()

	const token = typeof query.token === 'string' || typeof query.token === 'object' ? query.token : null

	const { selectedChains, selectedAttributes, minTvl, maxTvl } = useFormatYieldQueryParams({
		projectList,
		chainList,
		categoryList,
		evmChains
	})

	const poolsData = React.useMemo(() => {
		const selectedChainsSet = new Set(selectedChains)

		const pools = findStrategyPoolsFR({ token: token ? query : null, filteredPools, perps })
			.filter((pool) =>
				filterPool({
					pool,
					selectedChainsSet,
					selectedAttributes,
					minTvl,
					maxTvl
				})
			)
			.sort((a, b) => b.openInterest - a.openInterest)

		return pools
	}, [token, query, filteredPools, perps, selectedAttributes, selectedChains, minTvl, maxTvl])

	const header = 'Strategy Finder' + (token ? `: ${typeof token === 'string' ? token : (token?.join(', ') ?? '')}` : '')

	return (
		<>
			<YieldFiltersV2
				header={header}
				resetFilters={true}
				noOfStrategies={poolsData?.length ?? null}
				tokens={tokens}
				chainsNumber={selectedChains.length}
				chainList={chainList}
				selectedChains={selectedChains}
				evmChains={evmChains}
				attributes={true}
				tvlRange={true}
				showSearchOnMobile
			/>

			{poolsData.length > 0 ? (
				<YieldsStrategyTableFR data={poolsData} />
			) : (
				<p className="rounded-md bg-(--cards-bg) p-3 text-center">
					Given a token this finder will display delta neutral "long-short" strategies across all our tracked pools and
					CEX perpetual swap markets.
					<br />
					It calculates annualised Strategy Returns taking into account the CEX funding rate and DeFi yield.
					<br />
					<br />
					To start just select a token above.
				</p>
			)}
		</>
	)
}

export default YieldsStrategyPageLongShort
