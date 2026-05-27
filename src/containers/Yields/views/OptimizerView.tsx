import { useRouter } from 'next/router'
import * as React from 'react'
import { buildBorrowAdvancedRowsQueryString, type BorrowAdvancedRow } from '../borrowAdvanced'
import { YieldFiltersV2 } from '../Filters'
import { useFormatYieldQueryParams } from '../hooks'
import { useBorrowAdvancedRows, useGetPrice } from '../queries.client'
import { YieldsOptimizerTable } from '../Tables/Optimizer'

const EMPTY_POOL_ROWS: BorrowAdvancedRow[] = []

export const BorrowAggregatorAdvanced = ({ chainList, lendingProtocols, searchData, evmChains }) => {
	const { query } = useRouter()

	const lendAmount = query.lendAmount ? +query.lendAmount : 0
	const borrowAmount = query.borrowAmount ? +query.borrowAmount : 0

	const { lend, borrow } = query
	const { selectedChains, selectedAttributes, selectedLendingProtocols } = useFormatYieldQueryParams({
		chainList,
		lendingProtocols,
		evmChains
	})

	const rowsQueryString = React.useMemo(() => buildBorrowAdvancedRowsQueryString(query), [query])
	const { data: poolsData = EMPTY_POOL_ROWS, isLoading, isError } = useBorrowAdvancedRows(rowsQueryString)
	const hasSelection = rowsQueryString !== null

	const tokens = React.useMemo(() => {
		const set = new Set<string>()

		for (const pool of poolsData) {
			const chain = pool.chain?.toLowerCase()
			const lendToken = pool.underlyingTokens?.[0]?.toLowerCase()?.replaceAll('/', ':')
			const borrowToken =
				pool.borrow?.underlyingTokens?.length > 0
					? pool.borrow.underlyingTokens[pool.borrow.underlyingTokens.length - 1].toLowerCase().replaceAll('/', ':')
					: null

			if (chain && lendToken) set.add(`${chain}:${lendToken}`)
			if (chain && borrowToken) set.add(`${chain}:${borrowToken}`)
		}

		return Array.from(set)
	}, [poolsData])

	const { data: prices } = useGetPrice(tokens)

	const poolsDataWithAmounts = React.useMemo(() => {
		if (lendAmount === 0 && borrowAmount === 0) return poolsData
		const poolsWithAmounts = []
		for (const pool of poolsData) {
			if (pool.exposure !== 'single') continue
			// `prices` is keyed by the same string we request in `tokens`: `<chain>:<token>` (with `/` normalized to `:`)
			if (!prices) continue

			const chain = pool.chain?.toLowerCase()
			const lendToken = pool.underlyingTokens?.[0]?.toLowerCase()?.replaceAll('/', ':')
			const borrowToken =
				pool.borrow?.underlyingTokens?.length > 0
					? pool.borrow.underlyingTokens[pool.borrow.underlyingTokens.length - 1].toLowerCase().replaceAll('/', ':')
					: null

			if (!chain || !lendToken || !borrowToken) continue

			const lendPrice = prices[`${chain}:${lendToken}`]
			const borrowPrice = prices[`${chain}:${borrowToken}`]

			const lendPriceNum = lendPrice?.price
			const borrowPriceNum = borrowPrice?.price

			if (
				!Number.isFinite(lendPriceNum) ||
				!Number.isFinite(borrowPriceNum) ||
				lendPriceNum <= 0 ||
				borrowPriceNum <= 0
			)
				continue
			if (!Number.isFinite(pool.ltv) || pool.ltv <= 0) continue
			if (lendAmount !== 0 && borrowAmount !== 0) {
				const lendUSDAmount = lendAmount * lendPriceNum
				const borrowUSDAmount = borrowAmount * borrowPriceNum
				const availableToBorrowUSD = lendUSDAmount * pool.ltv
				if (availableToBorrowUSD < borrowUSDAmount) continue
				poolsWithAmounts.push({
					...pool,
					lendUSDAmount,
					lendAmount,
					borrowAmount,
					borrowUSDAmount,
					lendPrice,
					borrowPrice
				})
				continue
			}
			if (lendAmount !== 0) {
				const lendUSDAmount = lendAmount * lendPriceNum
				const borrowUSDAmount = lendUSDAmount * pool.ltv
				const calculatedBorrowAmount = borrowUSDAmount / borrowPriceNum

				if (
					!Number.isFinite(lendUSDAmount) ||
					!Number.isFinite(borrowUSDAmount) ||
					!Number.isFinite(calculatedBorrowAmount)
				)
					continue
				poolsWithAmounts.push({
					...pool,
					lendUSDAmount,
					lendAmount,
					borrowAmount: calculatedBorrowAmount,
					borrowUSDAmount,
					lendPrice,
					borrowPrice
				})
			} else {
				const borrowUSDAmount = borrowAmount * borrowPriceNum
				const lendUSDAmount = borrowUSDAmount / pool.ltv
				const calculatedLendAmount = lendUSDAmount / lendPriceNum

				if (
					!Number.isFinite(lendUSDAmount) ||
					!Number.isFinite(borrowUSDAmount) ||
					!Number.isFinite(calculatedLendAmount)
				)
					continue

				poolsWithAmounts.push({
					...pool,
					lendUSDAmount,
					borrowAmount,
					borrowUSDAmount,
					lendPrice,
					borrowPrice,
					lendAmount: calculatedLendAmount
				})
			}
		}

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
				evmChains={evmChains}
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

			{hasSelection && isLoading ? (
				<p className="rounded-md border border-(--cards-border) bg-(--cards-bg) p-3 text-center">
					Loading lending routes...
				</p>
			) : hasSelection && isError ? (
				<p className="rounded-md border border-(--cards-border) bg-(--cards-bg) p-3 text-center">
					Couldn't load lending routes.
				</p>
			) : poolsData.length > 0 ? (
				<YieldsOptimizerTable data={poolsDataWithAmounts} />
			) : (
				<p className="rounded-md border border-(--cards-border) bg-(--cards-bg) p-3 text-center">
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
				</p>
			)}
		</>
	)
}
