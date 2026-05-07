import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { IYieldsOptimizerBorrowLeg, IYieldsOptimizerTableRow } from '~/containers/Yields/Tables/types'

const strategiesState: {
	data?: any
	error?: Error | null
	isLoading: boolean
} = {
	data: {
		borrowAsCollateral: [],
		borrowAsDebt: []
	},
	error: null,
	isLoading: false
}

vi.mock('~/components/Filters/ResponsiveFilterLayout', () => ({
	ResponsiveFilterLayout: ({ children }: { children: (nestedMenu: boolean) => React.ReactNode }) => (
		<div>{children(false)}</div>
	)
}))

vi.mock('~/components/Filters/FilterBetweenRange', () => ({
	FilterBetweenRange: ({ trigger }: { trigger: React.ReactNode }) => <div>{trigger}</div>
}))

vi.mock('~/components/Icon', () => ({
	Icon: ({ name }: { name: string }) => <span>{name}</span>
}))

vi.mock('~/components/Loaders', () => ({
	LocalLoader: () => <div>loader</div>,
	LoadingSpinner: () => <div>spinner</div>
}))

vi.mock('~/components/Select/SelectWithCombobox', () => ({
	SelectWithCombobox: ({ label }: { label: string }) => <div>{label}</div>
}))

vi.mock('~/containers/Yields/Tables/Optimizer', () => ({
	PaginatedYieldsOptimizerTable: ({
		data,
		initialPageSize,
		initialPageIndex
	}: {
		data: Array<{ symbol: string; borrow: { symbol: string } }>
		initialPageSize?: number
		initialPageIndex?: number
	}) => <div>{`optimizer-table:${data.length}:${initialPageSize ?? 'default'}:${initialPageIndex ?? 0}`}</div>
}))

vi.mock('./useTokenBorrowRoutes', () => ({
	useTokenBorrowRoutes: (_tokenSymbol: string, options?: { enabled?: boolean }) =>
		options?.enabled === false ? { data: undefined, error: null, isLoading: false } : strategiesState
}))

afterEach(() => {
	strategiesState.data = {
		borrowAsCollateral: [],
		borrowAsDebt: []
	}
	strategiesState.error = null
	strategiesState.isLoading = false
	vi.clearAllMocks()
	vi.restoreAllMocks()
})

import { TokenBorrowSection, filterBorrowRows } from './TokenBorrowSection'

function makeBorrowRow(
	overrides: Partial<IYieldsOptimizerTableRow> = {},
	borrowOverrides: Partial<IYieldsOptimizerBorrowLeg> = {}
): IYieldsOptimizerTableRow {
	const borrowLeg: IYieldsOptimizerBorrowLeg = {
		symbol: 'USDC',
		totalAvailableUsd: 500_000,
		apyBaseBorrow: 0,
		apyRewardBorrow: 0,
		...borrowOverrides
	}

	return {
		pool: 'ETH-USDC',
		projectslug: 'aave-v3',
		project: 'Aave',
		projectName: 'Aave',
		chains: ['Ethereum'],
		tvl: 1_000_000,
		apy: 5,
		apyBase: 4,
		apyReward: 1,
		rewardTokensSymbols: [],
		rewards: [],
		change1d: null,
		change7d: null,
		confidence: null,
		url: 'https://example.com/pool',
		category: 'Lending',
		configID: 'pool-1',
		symbol: 'ETH',
		borrow: borrowLeg,
		rewardTokensNames: [],
		totalAvailableUsd: 500_000,
		lendUSDAmount: 0,
		borrowUSDAmount: 0,
		lendAmount: 0,
		borrowAmount: 0,
		...overrides
	}
}

describe('TokenBorrowSection', () => {
	it('shows a loader while shared token strategies are loading', () => {
		strategiesState.data = undefined
		strategiesState.error = null
		strategiesState.isLoading = true

		const html = renderToStaticMarkup(<TokenBorrowSection tokenSymbol="ETH" />)

		expect(html).toContain('loader')
		expect(html).toContain('Use ETH')
		expect(html).toContain('Borrow ETH')
	})

	it('shows the default use-token table with pagination', () => {
		strategiesState.data = {
			borrowAsCollateral: [makeBorrowRow()],
			borrowAsDebt: [makeBorrowRow({ symbol: 'WBTC' }, { symbol: 'ETH', totalAvailableUsd: 250000 })]
		}
		strategiesState.error = null
		strategiesState.isLoading = false

		const html = renderToStaticMarkup(<TokenBorrowSection tokenSymbol="ETH" />)

		expect(html).toContain('Tracking 1 route')
		expect(html).toContain('Available')
		expect(html).toContain('optimizer-table:1:10:0')
	})

	it('renders prefetched strategies without waiting for a client fetch', () => {
		strategiesState.data = undefined
		strategiesState.error = null
		strategiesState.isLoading = true

		const html = renderToStaticMarkup(
			<TokenBorrowSection
				tokenSymbol="ETH"
				initialData={{
					borrowAsCollateral: [makeBorrowRow()],
					borrowAsDebt: []
				}}
				initialCounts={{
					borrowAsCollateral: 1,
					borrowAsDebt: 0
				}}
			/>
		)

		expect(html).toContain('Tracking 1 route')
		expect(html).toContain('optimizer-table:1:10:0')
		expect(html).not.toContain('loader')
	})

	it('shows deferred pagination controls when only the first page is prefetched', () => {
		strategiesState.data = undefined
		strategiesState.error = null
		strategiesState.isLoading = false

		const html = renderToStaticMarkup(
			<TokenBorrowSection
				tokenSymbol="ETH"
				initialData={{
					borrowAsCollateral: [makeBorrowRow()],
					borrowAsDebt: []
				}}
				initialCounts={{
					borrowAsCollateral: 25,
					borrowAsDebt: 0
				}}
				initialChains={{
					borrowAsCollateral: ['Ethereum'],
					borrowAsDebt: []
				}}
			/>
		)

		expect(html).toContain('Showing 1 of 25 routes')
		expect(html).toContain('Page 1 of 3')
	})

	it('renders both borrow tab labels', () => {
		const html = renderToStaticMarkup(<TokenBorrowSection tokenSymbol="ETH" />)

		expect(html).toContain('Use ETH')
		expect(html).toContain('Borrow ETH')
	})

	it('shows an empty state when no routes exist for the selected tab', () => {
		const html = renderToStaticMarkup(<TokenBorrowSection tokenSymbol="ETH" />)

		expect(html).toContain('No borrow routes found using ETH as collateral.')
	})

	it('filters routes by exact chain and available liquidity bounds', () => {
		const filtered = filterBorrowRows({
			rows: [
				{
					symbol: 'ETH',
					borrow: { symbol: 'USDC', totalAvailableUsd: 500000 },
					chains: ['Ethereum']
				},
				{
					symbol: 'ETH',
					borrow: { symbol: 'DAI', totalAvailableUsd: 5000 },
					chains: ['Arbitrum']
				}
			] as any,
			selectedChains: ['Ethereum'],
			minAvailable: '10000',
			maxAvailable: ''
		})

		expect(filtered).toHaveLength(1)
		expect(filtered[0].borrow.symbol).toBe('USDC')
	})

	it('returns no rows when no chains are selected explicitly', () => {
		const filtered = filterBorrowRows({
			rows: [
				{
					symbol: 'ETH',
					borrow: { symbol: 'USDC', totalAvailableUsd: 500000 },
					chains: ['Ethereum']
				}
			] as any,
			selectedChains: [],
			minAvailable: '',
			maxAvailable: ''
		})

		expect(filtered).toHaveLength(0)
	})
})
