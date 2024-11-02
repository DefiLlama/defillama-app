import * as React from 'react'
import { useRouter } from 'next/router'
import { Panel } from '~/components'
import { YieldsOptimizerTable } from '~/components/Table/Yields/Optimizer'
import { YieldFiltersV2 } from '~/components/Filters/yields'
import { useFormatYieldQueryParams } from './hooks'
import { filterPool, findOptimizerPools, formatOptimizerPool } from './utils'
import { useGetPrice } from './queries'

const YieldsOptimizerPage = ({ pools, projectList, chainList, categoryList, lendingProtocols, searchData }) => {
	const { pathname, query } = useRouter()
	const customLTV = typeof query.customLTV === 'string' ? query.customLTV : null
	const minAvailable = typeof query.minAvailable === 'string' ? query.minAvailable : null
	const maxAvailable = typeof query.maxAvailable === 'string' ? query.maxAvailable : null

	const lendAmount = query.lendAmount ? +query.lendAmount : 0
	const borrowAmount = query.borrowAmount ? +query.borrowAmount : 0

	const { lend, borrow } = query
	const { selectedChains, selectedAttributes, selectedLendingProtocols } = useFormatYieldQueryParams({
		projectList,
		chainList,
		lendingProtocols,
		categoryList
	})

	// get cdp collateral -> debt token route
	const cdpPools = pools
		.filter((p) => p.category === 'CDP' && p.mintedCoin)
		.map((p) => ({ ...p, chains: [p.chain], borrow: { ...p, symbol: p.mintedCoin.toUpperCase() } }))

	const lendingPools = pools.filter((p) => p.category !== 'CDP')
	const poolsData = React.useMemo(() => {
		if (pathname === '/borrow/advanced' && (lend === '' || borrow === '')) {
			return []
		} else if (lend === undefined || borrow === undefined) {
			return []
		}
		let filteredPools = findOptimizerPools({
			pools: lendingPools,
			tokenToLend: lend,
			tokenToBorrow: borrow,
			cdpRoutes: cdpPools
		})
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
		customLTV,
		pathname
	])

	const tokens = React.useMemo(() => {
		return [
			...new Set(
				poolsData
					.map((pool) => [
						`${pool.chain?.toLowerCase()}:${pool.underlyingTokens[0]?.toLowerCase()}`,
						`${pool.chain?.toLowerCase()}:${pool.borrow.underlyingTokens[0]?.toLowerCase()}`
					])
					.flat()
			)
		] as Array<string>
	}, [poolsData])

	const { data: prices } = useGetPrice(tokens)

	const poolsDataWithAmounts = React.useMemo(() => {
		if (lendAmount === 0 && borrowAmount === 0) return poolsData
		const poolsWithAmounts = poolsData
			.filter((pool) => pool.exposure === 'single')
			.map((pool) => {
				if (!prices) return pool
				const lendPrice = prices[`${pool.underlyingTokens[0]?.toLowerCase()}`]
				const borrowPrice = prices[`${pool.borrow.underlyingTokens[0]?.toLowerCase()}`]
				if (!lendPrice || !borrowPrice) return null
				if (lendAmount !== 0 && borrowAmount !== 0) {
					const lendUSDAmount = lendAmount * lendPrice?.price || 0
					const borrowUSDAmount = borrowAmount * borrowPrice?.price || 0
					const availableToBorrowUSD = lendUSDAmount * pool.ltv || 0
					if (availableToBorrowUSD < borrowUSDAmount) return null
					return {
						...pool,
						lendUSDAmount,
						lendAmount,
						borrowAmount,
						borrowUSDAmount,
						lendPrice,
						borrowPrice
					}
				}
				if (lendAmount !== 0) {
					const lendUSDAmount = lendAmount * lendPrice?.price || 0
					const borrowUSDAmount = lendUSDAmount * pool.ltv || 0
					const borrowAmount = borrowUSDAmount / borrowPrice?.price || 0

					if (![lendUSDAmount, borrowUSDAmount, borrowAmount].every((e) => isFinite(+e))) return null
					return {
						...pool,
						lendUSDAmount,
						lendAmount,
						borrowAmount,
						borrowUSDAmount,
						lendPrice,
						borrowPrice
					}
				} else {
					const borrowUSDAmount = borrowAmount * borrowPrice?.price || 0
					const lendUSDAmount = borrowUSDAmount / pool.ltv || 0
					const lendAmount = lendUSDAmount / lendPrice?.price || 0

					if (![lendUSDAmount, borrowUSDAmount, lendAmount].every((e) => isFinite(e))) return null

					return {
						...pool,
						lendUSDAmount,
						borrowAmount,
						borrowUSDAmount,
						lendPrice,
						borrowPrice,
						lendAmount
					}
				}
			})
			.filter((pool) => pool !== null)

		return poolsWithAmounts
	}, [poolsData, prices, lendAmount, borrowAmount])

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
				ltvPlaceholder={'Custom LTV'}
			/>

			{poolsData.length > 0 ? (
				<YieldsOptimizerTable data={poolsDataWithAmounts} />
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
