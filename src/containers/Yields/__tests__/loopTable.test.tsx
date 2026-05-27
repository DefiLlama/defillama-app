import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { PaginatedYieldsLoopTable } from '../Tables/Loop'
import type { YieldLoopTableRow } from '../Tables/types'

vi.mock('../Tables/Name', () => ({
	NameYieldPool: ({ value, rowIndex }: { value: string; rowIndex?: number }) => (
		<span>
			<span aria-hidden="true">{rowIndex}</span>
			{value}
		</span>
	),
	NameYield: () => null
}))

function loopRow(id: number): YieldLoopTableRow {
	return {
		pool: `ETH-${id}`,
		configID: `loop-${id}`,
		projectslug: 'aave-v3',
		project: 'Aave V3',
		airdrop: false,
		raiseValuation: null,
		chains: ['Ethereum'],
		apyBase: 2,
		apyReward: 0,
		apyBorrow: -1,
		apyBaseBorrow: -1,
		apyRewardBorrow: 0,
		totalSupplyUsd: 1_000,
		totalBorrowUsd: 100,
		totalAvailableUsd: 900,
		url: '',
		ltv: 0.5,
		rewardTokensSymbols: [],
		rewards: [],
		tvl: 1_000,
		apy: 2,
		change1d: null,
		change7d: null,
		confidence: null,
		category: 'Lending',
		strikeTvl: false,
		loopApy: 5,
		netSupplyApy: 2,
		boost: 2
	}
}

describe('PaginatedYieldsLoopTable', () => {
	it('renders display row numbers from the server-paginated table state', () => {
		const html = renderToStaticMarkup(
			<PaginatedYieldsLoopTable
				data={[loopRow(1), loopRow(2)]}
				manualPagination
				manualSorting
				rowCount={100}
				paginationState={{ pageIndex: 1, pageSize: 50 }}
				sortingState={[]}
				onPaginationChange={() => {}}
				onSortingChange={() => {}}
			/>
		)

		expect(html).toMatch(/aria-hidden="true">51<\/span>/)
		expect(html).toMatch(/aria-hidden="true">52<\/span>/)
	})
})
