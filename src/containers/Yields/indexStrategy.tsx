import * as React from 'react'
import { useRouter } from 'next/router'
import { YieldFiltersV2 } from './Filters'
import { useFormatYieldQueryParams } from './hooks'
import { YieldsStrategyTable } from './Tables/Strategy'
import { filterPool, findStrategyPools } from './utils'

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

	const {
		selectedChains,
		selectedAttributes,
		selectedLendingProtocols,
		selectedFarmProtocols,
		minTvl,
		maxTvl,
		minAvailable,
		maxAvailable,
		customLTV
	} = useFormatYieldQueryParams({
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
		const selectedChainsSet = new Set(selectedChains)
		const selectedLendingProtocolsSet = selectedLendingProtocols ? new Set(selectedLendingProtocols) : null
		const selectedFarmProtocolsSet = selectedFarmProtocols ? new Set(selectedFarmProtocols) : null

		let filteredPools = findStrategyPools({
			pools: lendingPools,
			tokenToLend: lend,
			tokenToBorrow: borrow,
			allPools,
			cdpRoutes: cdpPools,
			customLTV
		}).filter((pool) =>
			filterPool({
				pool,
				selectedChainsSet,
				selectedAttributes,
				minTvl,
				maxTvl,
				minAvailable,
				maxAvailable,
				selectedLendingProtocolsSet,
				selectedFarmProtocolsSet,
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
				<p className="rounded-md bg-(--cards-bg) p-3 text-center">
					Given a collateral token this finder will display "lend-borrow-farm" strategies across all our tracked pools.
					<br />
					It calculates the total Strategy APY taking into account the individual apy components at each step.
					<br />
					<br />
					To narrow search results, you can optionally select a token to borrow.
					<br />
					<br />
					To start just select a collateral token above.
				</p>
			)}
		</>
	)
}

export default YieldsStrategyPage
