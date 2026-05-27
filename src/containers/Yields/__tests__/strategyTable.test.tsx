import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { PaginatedYieldsStrategyTable } from '../Tables/Strategy'
import type { YieldStrategyTableRow } from '../Tables/types'

vi.mock('../Tables/Name', () => ({
	NameYieldPool: ({ value }: { value: string }) => <span>{value}</span>,
	PoolStrategyRoute: () => null
}))

function strategyRow(id: number): YieldStrategyTableRow {
	return {
		strategy: 'lend-borrow-farm',
		symbol: `ETH${id}`,
		pool: `lend-${id}`,
		projectName: 'Aave V3',
		project: 'aave-v3',
		airdrop: false,
		raiseValuation: null,
		chains: ['Ethereum'],
		url: '',
		apy: 2,
		borrow: {
			pool: `borrow-${id}`,
			symbol: 'USDC',
			totalAvailableUsd: 1_000,
			apyBorrow: -1
		},
		farmPool: `farm-${id}`,
		farmSymbol: 'USDC',
		farmProjectName: 'Farm',
		farmTvlUsd: 10_000,
		farmApy: 8,
		totalApy: 5,
		delta: 3,
		ltv: 0.5,
		strikeTvl: false
	}
}

describe('PaginatedYieldsStrategyTable', () => {
	it('renders display row numbers from the server-paginated table state', () => {
		const html = renderToStaticMarkup(
			<PaginatedYieldsStrategyTable
				data={[strategyRow(1), strategyRow(2)]}
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
		expect(html).not.toContain('vf-row-index')
	})
})
