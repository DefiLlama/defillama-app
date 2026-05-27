import { useRouter } from 'next/router'
import { YIELD_STRATEGY_DATASET_API } from '~/constants'
import { YieldFiltersV2 } from '../Filters'
import { useFormatYieldQueryParams } from '../hooks'
import { PaginatedYieldsStrategyTable } from '../Tables/Strategy'
import type { YieldStrategyTableRow } from '../Tables/types'
import { useYieldsServerTable } from '../useYieldsServerTable'

const YieldsStrategyPage = ({
	projectList,
	searchData,
	chainList,
	categoryList,
	lendingProtocols,
	farmProtocols,
	evmChains
}) => {
	const router = useRouter()
	const { query } = router
	const {
		rows: poolsData,
		total: poolsNumber,
		rowsQuery,
		tableProps
	} = useYieldsServerTable<YieldStrategyTableRow>({
		endpoint: YIELD_STRATEGY_DATASET_API
	})

	const lend = typeof query.lend === 'string' ? query.lend : null
	const borrow = typeof query.borrow === 'string' ? query.borrow : null

	const { selectedChains, selectedLendingProtocols, selectedFarmProtocols } = useFormatYieldQueryParams({
		projectList,
		chainList,
		categoryList,
		lendingProtocols,
		farmProtocols,
		evmChains
	})

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
				evmChains={evmChains}
				lendingProtocols={lendingProtocols}
				selectedLendingProtocols={selectedLendingProtocols}
				farmProtocols={farmProtocols}
				selectedFarmProtocols={selectedFarmProtocols}
				attributes={true}
				tvlRange={true}
				availableRange={true}
				resetFilters={true}
				noOfStrategies={poolsNumber}
				strategyInputsData={searchData}
				ltvPlaceholder={'% of max LTV'}
			/>

			{rowsQuery.isLoading && !rowsQuery.data ? (
				<p className="flex flex-1 items-center justify-center rounded-md border border-(--cards-border) bg-(--cards-bg) p-5">
					Loading strategies...
				</p>
			) : rowsQuery.isError ? (
				<p className="flex flex-1 items-center justify-center rounded-md border border-(--cards-border) bg-(--cards-bg) p-5">
					Couldn't load strategies.
				</p>
			) : poolsData.length > 0 ? (
				<PaginatedYieldsStrategyTable data={poolsData} {...tableProps} />
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
