import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

const strategiesState: {
	data?: any
	error?: Error | null
	isLoading: boolean
} = {
	data: {
		borrowAsCollateral: [],
		borrowAsDebt: [],
		longShort: []
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
	LocalLoader: () => <div>loader</div>
}))

vi.mock('~/components/Select/SelectWithCombobox', () => ({
	SelectWithCombobox: ({ label }: { label: string }) => <div>{label}</div>
}))

vi.mock('~/containers/Yields/Tables/Optimizer', () => ({
	PaginatedYieldsOptimizerTable: ({
		data,
		initialPageSize
	}: {
		data: Array<{ symbol: string; borrow: { symbol: string } }>
		initialPageSize?: number
	}) => <div>{`optimizer-table:${data.length}:${initialPageSize ?? 'default'}`}</div>
}))

vi.mock('./useTokenStrategies', () => ({
	useTokenStrategies: (_tokenSymbol: string, initialData?: unknown) =>
		strategiesState.data === undefined && initialData !== undefined
			? { data: initialData, error: null, isLoading: false }
			: strategiesState
}))

afterEach(() => {
	strategiesState.data = {
		borrowAsCollateral: [],
		borrowAsDebt: [],
		longShort: []
	}
	strategiesState.error = null
	strategiesState.isLoading = false
	vi.clearAllMocks()
	vi.restoreAllMocks()
})

import { TokenBorrowSection, filterBorrowRows } from './TokenBorrowSection'

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
			borrowAsCollateral: [
				{
					symbol: 'ETH',
					borrow: { symbol: 'USDC', totalAvailableUsd: 500000 },
					chains: ['Ethereum']
				}
			],
			borrowAsDebt: [
				{
					symbol: 'WBTC',
					borrow: { symbol: 'ETH', totalAvailableUsd: 250000 },
					chains: ['Ethereum']
				}
			],
			longShort: []
		}
		strategiesState.error = null
		strategiesState.isLoading = false

		const html = renderToStaticMarkup(<TokenBorrowSection tokenSymbol="ETH" />)

		expect(html).toContain('Tracking 1 route')
		expect(html).toContain('Available')
		expect(html).toContain('optimizer-table:1:10')
	})

	it('renders prefetched strategies without waiting for a client fetch', () => {
		strategiesState.data = undefined
		strategiesState.error = null
		strategiesState.isLoading = true

		const html = renderToStaticMarkup(
			<TokenBorrowSection
				tokenSymbol="ETH"
				initialData={{
					borrowAsCollateral: [
						{
							symbol: 'ETH',
							borrow: { symbol: 'USDC', totalAvailableUsd: 500000 },
							chains: ['Ethereum']
						}
					],
					borrowAsDebt: [],
					longShort: []
				}}
			/>
		)

		expect(html).toContain('Tracking 1 route')
		expect(html).toContain('optimizer-table:1:10')
		expect(html).not.toContain('loader')
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
