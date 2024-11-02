import * as React from 'react'
import { useRouter } from 'next/router'
import { Panel } from '~/components'
import { YieldsStrategyTable } from '~/components/Table/Yields/Strategy'
import { YieldFiltersV2 } from '~/components/Filters/yields'
import { filterPool, findStrategyPools } from './utils'
import { useFormatYieldQueryParams } from './hooks'

const YieldsStrategyPage = ({
	pools,
	projectList,
	searchData,
	chainList,
	categoryList,
	allPools,
	lendingProtocols,
	farmProtocols
}) => {
	const { query } = useRouter()

	const lend = typeof query.lend === 'string' ? query.lend : null
	const borrow = typeof query.borrow === 'string' ? query.borrow : null
	const minTvl = typeof query.minTvl === 'string' ? query.minTvl : null
	const maxTvl = typeof query.maxTvl === 'string' ? query.maxTvl : null
	const minAvailable = typeof query.minAvailable === 'string' ? query.minAvailable : null
	const maxAvailable = typeof query.maxAvailable === 'string' ? query.maxAvailable : null
	const customLTV = typeof query.customLTV === 'string' ? query.customLTV : null

	const { selectedChains, selectedAttributes, selectedLendingProtocols, selectedFarmProtocols } =
		useFormatYieldQueryParams({
			projectList,
			chainList,
			categoryList,
			lendingProtocols,
			farmProtocols
		})

	// prepare cdp pools
	const cdpPools = pools
		.filter((p) => p.category === 'CDP' && p.mintedCoin)
		.map((p) => ({ ...p, chains: [p.chain], borrow: { ...p, symbol: p.mintedCoin.toUpperCase() } }))

	// exclude cdp from lending
	const lendingPools = pools.filter((p) => p.category !== 'CDP')
	const poolsData = React.useMemo(() => {
		let filteredPools = findStrategyPools(lendingPools, lend, borrow, allPools, cdpPools, customLTV).filter((pool) =>
			filterPool({
				pool,
				selectedChains,
				selectedAttributes,
				minTvl,
				maxTvl,
				minAvailable,
				maxAvailable,
				selectedLendingProtocols,
				selectedFarmProtocols,
				customLTV,
				strategyPage: true
			})
		)

		return filteredPools
	}, [
		lendingPools,
		borrow,
		lend,
		selectedChains,
		selectedAttributes,
		selectedLendingProtocols,
		selectedFarmProtocols,
		allPools,
		cdpPools,
		minTvl,
		maxTvl,
		minAvailable,
		maxAvailable,
		customLTV
	])

	const header = `Strategy Finder ${
		lend && !borrow
			? `(Supply: ${lend || ''} )`
			: lend && borrow
			? `(Supply: ${lend || ''} ➞ Borrow: ${borrow || ''} ➞ Farm: ${borrow || ''})`
			: ''
	}`

	return (
		<>
			<YieldFiltersV2
				header={header}
				chainsNumber={selectedChains.length}
				chainList={chainList}
				selectedChains={selectedChains}
				lendingProtocols={lendingProtocols}
				selectedLendingProtocols={selectedLendingProtocols}
				farmProtocols={farmProtocols}
				selectedFarmProtocols={selectedFarmProtocols}
				attributes={true}
				tvlRange={true}
				availableRange={true}
				resetFilters={true}
				noOfStrategies={poolsData?.length ?? null}
				strategyInputsData={searchData}
				ltvPlaceholder={'% of max LTV'}
			/>

			{poolsData.length > 0 ? (
				<YieldsStrategyTable data={poolsData} />
			) : (
				<Panel as="p" style={{ margin: 0, textAlign: 'center' }}>
					Given a collateral token this finder will display "lend-borrow-farm" strategies across all our tracked pools.
					<br />
					It calculates the total Strategy APY taking into account the individual apy components at each step.
					<br />
					<br />
					To narrow search results, you can optionally select a token to borrow.
					<br />
					<br />
					To start just select a collateral token above.
				</Panel>
			)}
		</>
	)
}

export default YieldsStrategyPage
