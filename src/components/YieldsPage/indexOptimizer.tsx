import * as React from 'react'
import { useRouter } from 'next/router'
import { Panel } from '~/components'
import YieldsOptimizerTable from '~/components/Table/Yields/Optimizer'
import { YieldFiltersV2 } from '~/components/Filters'
import { useFormatYieldQueryParams } from './hooks'
import { filterPool, findOptimizerPools, formatOptimizerPool } from './utils'

const YieldsOptimizerPage = ({ pools, projectList, chainList, categoryList, lendingProtocols, searchData }) => {
	const { query } = useRouter()
	const customLTV = typeof query.customLTV === 'string' ? query.customLTV : null
	const minAvailable = typeof query.minAvailable === 'string' ? query.minAvailable : null
	const maxAvailable = typeof query.maxAvailable === 'string' ? query.maxAvailable : null

	const { lend, borrow } = query
	const { selectedChains, selectedAttributes, selectedLendingProtocols } = useFormatYieldQueryParams({
		projectList,
		chainList,
		lendingProtocols,
		categoryList
	})

	// get cdp collateral -> debt token route
	const cdpPools = pools
		.filter((p) => p.category === 'CDP')
		.map((p) => ({ ...p, chains: [p.chain], borrow: { ...p, symbol: p.mintedCoin.toUpperCase() } }))

	const lendingPools = pools.filter((p) => p.category !== 'CDP')
	const poolsData = React.useMemo(() => {
		let filteredPools = findOptimizerPools(lendingPools, lend, borrow, cdpPools)
			.filter((pool) => {
				if (typeof lend === 'string' && lend.toLowerCase() === 'eth' && pool.symbol?.toLowerCase().includes('steth')) {
					return false
				}

				if (
					typeof borrow === 'string' &&
					borrow.toLowerCase() === 'eth' &&
					pool.borrow?.symbol?.toLowerCase().includes('steth')
				) {
					return false
				}

				return filterPool({
					pool,
					selectedChains,
					selectedAttributes,
					minAvailable,
					maxAvailable,
					selectedLendingProtocols,
					customLTV
				})
			})
			.map((p) => formatOptimizerPool(p, customLTV))
			.sort((a, b) => b.totalReward - a.totalReward)

		return filteredPools
	}, [
		lendingPools,
		lend,
		borrow,
		cdpPools,
		selectedChains,
		selectedAttributes,
		minAvailable,
		maxAvailable,
		selectedLendingProtocols,
		customLTV
	])

	const header = `Lending Optimizer Calculator ${
		lend && borrow ? `(Supply: ${lend || ''} ➞ Borrow: ${borrow || ''})` : ''
	}`

	return (
		<>
			<YieldFiltersV2
				header={header}
				chainList={chainList}
				selectedChains={selectedChains}
				lendingProtocols={lendingProtocols}
				selectedLendingProtocols={selectedLendingProtocols}
				attributes={true}
				availableRange={true}
				resetFilters={true}
				excludeBadDebt={true}
				selectedAttributes={selectedAttributes}
				excludeRewardApy={true}
				strategyInputsData={searchData}
			/>

			{poolsData.length > 0 ? (
				<YieldsOptimizerTable data={poolsData} />
			) : (
				<Panel as="p" style={{ margin: 0, textAlign: 'center' }}>
					Given a token to use for collateral and a token to borrow, this calculator will look at all the lending
					protocols
					<br />
					and calculate how much would it cost to borrow on each one, taking into account incentives, supply APR and
					borrow APR,
					<br />
					providing a list of all possible lending routes, their cost and LTV.
					<br />
					<br />
					This is similar to skyscanner for flights or 1inch for swaps, but for lending. It calculates the optimal
					lending route.
					<br />
					<br />
					To start just select two tokens above.
				</Panel>
			)}
		</>
	)
}

export default YieldsOptimizerPage
