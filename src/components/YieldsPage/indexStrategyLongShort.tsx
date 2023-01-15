import * as React from 'react'
import { useRouter } from 'next/router'
import { Panel } from '~/components'
import YieldsStrategyTableFR from '~/components/Table/Yields/StrategyFR'
import { YieldFiltersV2 } from '~/components/Filters'
import { filterPool, findStrategyPoolsFR } from './utils'
import { useFormatYieldQueryParams } from './hooks'

const YieldsStrategyPageLongShort = ({ filteredPools, perps, tokens, projectList, chainList, categoryList }) => {
	const { query } = useRouter()

	const token = typeof query.token === 'string' || typeof query.token === 'object' ? query.token : null
	const minTvl = typeof query.minTvl === 'string' ? query.minTvl : null
	const maxTvl = typeof query.maxTvl === 'string' ? query.maxTvl : null

	const { selectedChains, selectedAttributes } = useFormatYieldQueryParams({
		projectList,
		chainList,
		categoryList
	})

	const poolsData = React.useMemo(() => {
		const pools = findStrategyPoolsFR(token, filteredPools, perps)
			.filter((pool) =>
				filterPool({
					pool,
					selectedChains,
					selectedAttributes,
					minTvl,
					maxTvl
				})
			)
			.sort((a, b) => b.openInterest - a.openInterest)

		return pools
	}, [token, filteredPools, perps, selectedAttributes, selectedChains, minTvl, maxTvl])

	const header = 'Strategy Finder' + (token ? `: ${typeof token === 'string' ? token : token?.join(', ') ?? ''}` : '')

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
				attributes={true}
				tvlRange={true}
				showSearchOnMobile
			/>

			{poolsData.length > 0 ? (
				<YieldsStrategyTableFR data={poolsData} />
			) : (
				<Panel as="p" style={{ margin: 0, textAlign: 'center' }}>
					Given a token this finder will display delta neutral "long-short" strategies across all our tracked pools and
					CEX perpetual swap markets.
					<br />
					It calculates annualised Strategy Returns taking into account the CEX funding rate and DeFi yield.
					<br />
					<br />
					To start just select a token above.
				</Panel>
			)}
		</>
	)
}

export default YieldsStrategyPageLongShort
