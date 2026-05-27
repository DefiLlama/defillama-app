import type { SortingState } from '@tanstack/react-table'
import { useRouter } from 'next/router'
import { YIELD_LONG_SHORT_STRATEGY_DATASET_API } from '~/constants'
import { YieldFiltersV2 } from '../Filters'
import { useFormatYieldQueryParams } from '../hooks'
import { PaginatedYieldsStrategyTableFR } from '../Tables/StrategyFR'
import type { YieldLongShortStrategyTableRow } from '../Tables/types'
import { useYieldsServerTable } from '../useYieldsServerTable'

const EMPTY_ROWS: YieldLongShortStrategyTableRow[] = []
const LONG_SHORT_DEFAULT_SORTING: SortingState = [{ id: 'openInterest', desc: true }]

const YieldsStrategyPageLongShort = ({ tokens, projectList, chainList, categoryList, evmChains }) => {
	const router = useRouter()
	const { query } = router
	const token = typeof query.token === 'string' || typeof query.token === 'object' ? query.token : null
	const hasToken = typeof token === 'string' ? !!token : Array.isArray(token) ? token.length > 0 : false
	const {
		rows,
		total: poolsNumber,
		rowsQuery,
		tableProps
	} = useYieldsServerTable<YieldLongShortStrategyTableRow>({
		endpoint: YIELD_LONG_SHORT_STRATEGY_DATASET_API,
		enabled: hasToken,
		defaultSorting: LONG_SHORT_DEFAULT_SORTING
	})
	const poolsData = rows.length > 0 ? rows : EMPTY_ROWS

	const { selectedChains } = useFormatYieldQueryParams({
		projectList,
		chainList,
		categoryList,
		evmChains
	})

	const header = 'Strategy Finder' + (token ? `: ${typeof token === 'string' ? token : (token?.join(', ') ?? '')}` : '')

	return (
		<>
			<YieldFiltersV2
				header={header}
				resetFilters={true}
				noOfStrategies={poolsNumber}
				tokens={tokens}
				chainsNumber={selectedChains.length}
				chainList={chainList}
				selectedChains={selectedChains}
				evmChains={evmChains}
				attributes={true}
				tvlRange={true}
				showSearchOnMobile
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
				<PaginatedYieldsStrategyTableFR data={poolsData} {...tableProps} />
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
