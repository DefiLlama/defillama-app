import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

// Hoisted mutable state for the mocked hook below.
var strategiesState: {
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
	SelectWithCombobox: ({ label, selectedValues }: { label: string; selectedValues?: string[] }) => (
		<div>{`${label}:${selectedValues?.join(',') ?? ''}`}</div>
	)
}))

vi.mock('~/containers/Yields/Tables/StrategyFR', () => ({
	PaginatedYieldsStrategyTableFR: ({
		data,
		initialPageSize
	}: {
		data: Array<{ symbol: string; symbolPerp: string }>
		initialPageSize?: number
	}) => <div>{`strategy-fr-table:${data.length}:${initialPageSize ?? 'default'}`}</div>
}))

vi.mock('./useTokenStrategies', () => ({
	useTokenStrategies: () => strategiesState
}))

afterEach(() => {
	strategiesState = {
		data: {
			borrowAsCollateral: [],
			borrowAsDebt: [],
			longShort: []
		},
		error: null,
		isLoading: false
	}
	vi.clearAllMocks()
})

import { TokenLongShortSection, filterLongShortRows } from './TokenLongShortSection'

describe('TokenLongShortSection', () => {
	it('shows a loader while shared token strategies are loading', () => {
		strategiesState = {
			data: undefined,
			error: null,
			isLoading: true
		}

		const html = renderToStaticMarkup(<TokenLongShortSection tokenSymbol="ETH" />)

		expect(html).toContain('loader')
	})

	it('renders the paginated long/short table when rows exist', () => {
		strategiesState = {
			data: {
				borrowAsCollateral: [],
				borrowAsDebt: [],
				longShort: [
					{
						symbol: 'ETH',
						symbolPerp: 'ETH-PERP',
						chains: ['Ethereum'],
						exposure: 'single',
						ilRisk: 'no'
					}
				]
			},
			error: null,
			isLoading: false
		}

		const html = renderToStaticMarkup(<TokenLongShortSection tokenSymbol="ETH" />)

		expect(html).toContain('Tracking 1 strategy')
		expect(html).toContain('Attributes:single_exposure,no_il')
		expect(html).toContain('TVL Range')
		expect(html).toContain('strategy-fr-table:1:10')
	})

	it('shows the section empty state when no rows exist', () => {
		const html = renderToStaticMarkup(<TokenLongShortSection tokenSymbol="IN" />)

		expect(html).toContain('No tracked positive-funding long / short opportunities found for IN.')
	})

	it('filters long/short rows by exact chain selection', () => {
		const filtered = filterLongShortRows({
			rows: [
				{ symbol: 'IN', symbolPerp: 'IN-PERP', chains: ['Ethereum'] },
				{ symbol: 'IN', symbolPerp: 'IN-PERP', chains: ['Base'] }
			] as any,
			selectedChains: ['Base'],
			selectedAttributes: [],
			minTvl: '',
			maxTvl: ''
		})

		expect(filtered).toHaveLength(1)
		expect(filtered[0].chains[0]).toBe('Base')
	})
})
