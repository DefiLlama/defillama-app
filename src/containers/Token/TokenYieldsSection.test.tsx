import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { IYieldTableRow } from '~/containers/Yields/Tables/types'

var queryState: {
	data?: any
	error?: Error | null
	isLoading: boolean
} = {
	data: [],
	error: null,
	isLoading: false
}

var yieldsQueryState = {
	selectedChains: [] as string[],
	includeTokens: [] as string[],
	excludeTokens: [] as string[],
	minTvl: null as number | null,
	maxTvl: null as number | null,
	minApy: null as number | null,
	maxApy: null as number | null
}

var routerState = {
	pathname: '/token/[token]',
	query: {} as Record<string, string | string[]>,
	push: vi.fn()
}

vi.mock('@tanstack/react-query', () => ({
	useQuery: (options: { initialData?: unknown }) =>
		queryState.data === undefined && options.initialData !== undefined
			? { data: options.initialData, error: null, isLoading: false }
			: queryState
}))

vi.mock('next/router', () => ({
	useRouter: () => routerState
}))

vi.mock('~/components/Filters/ResponsiveFilterLayout', () => ({
	ResponsiveFilterLayout: ({ children }: { children: (nestedMenu: boolean) => React.ReactNode }) => (
		<div>{children(false)}</div>
	)
}))

vi.mock('~/components/Filters/TVLRange', () => ({
	TVLRange: () => <div>TVL Range</div>
}))

vi.mock('~/components/Icon', () => ({
	Icon: ({ name }: { name: string }) => <span>{name}</span>
}))

vi.mock('~/components/Loaders', () => ({
	LocalLoader: () => <div>loader</div>
}))

vi.mock('~/containers/Yields/Filters/APYRange', () => ({
	APYRange: () => <div>APY</div>
}))

vi.mock('~/containers/Yields/Filters/Chains', () => ({
	FilterByChain: () => <div>Chains</div>
}))

vi.mock('~/containers/Yields/Filters/ColumnFilters', () => ({
	ColumnFilters: () => <div>Columns</div>
}))

vi.mock('~/containers/Yields/Filters/Tokens', () => ({
	FilterByToken: () => <div>Tokens</div>
}))

vi.mock('~/containers/Yields/hooks', () => ({
	useFormatYieldQueryParams: () => yieldsQueryState
}))

vi.mock('~/containers/Yields/queries/client', () => ({
	useVolatility: () => ({ data: {} }),
	useHolderStats: () => ({ data: {} })
}))

vi.mock('~/containers/Yields/Tables/Pools', () => ({
	PaginatedYieldsPoolTable: ({
		data,
		enablePagination,
		initialPageSize
	}: {
		data: Array<{ pool: string }>
		enablePagination?: boolean
		initialPageSize?: number
	}) => (
		<div>{`yields-table:${data.length}:${enablePagination ? 'paginated' : 'plain'}:${initialPageSize ?? 'default'}`}</div>
	)
}))

afterEach(() => {
	queryState = {
		data: [],
		error: null,
		isLoading: false
	}
	yieldsQueryState = {
		selectedChains: [],
		includeTokens: [],
		excludeTokens: [],
		minTvl: null,
		maxTvl: null,
		minApy: null,
		maxApy: null
	}
	routerState = {
		pathname: '/token/[token]',
		query: {},
		push: vi.fn()
	}
	vi.clearAllMocks()
})

import { TokenYieldsSection } from './TokenYieldsSection'

function makeYieldRow(overrides: Partial<IYieldTableRow> = {}): IYieldTableRow {
	return {
		pool: 'stETH-ETH',
		project: 'Aave',
		projectslug: 'aave',
		configID: 'pool-1',
		chains: ['Ethereum'],
		tvl: 1_000_000,
		apy: 5.1,
		apyBase: null,
		apyReward: null,
		rewardTokensSymbols: [],
		rewards: [],
		change1d: null,
		change7d: null,
		confidence: null,
		url: 'https://example.com/pool-1',
		category: 'Lending',
		...overrides
	}
}

describe('TokenYieldsSection', () => {
	it('renders the protocol-yields filter controls and paginated table', () => {
		queryState = {
			data: [makeYieldRow()],
			error: null,
			isLoading: false
		}

		const html = renderToStaticMarkup(<TokenYieldsSection tokenSymbol="ETH" />)

		expect(html).toContain('Tracking 1 pool, average APY 5.10%')
		expect(html).toContain('Chains')
		expect(html).toContain('Tokens')
		expect(html).toContain('TVL Range')
		expect(html).toContain('APY')
		expect(html).toContain('Columns')
		expect(html).toContain('yields-table:1:paginated:10')
	})

	it('renders prefetched rows without waiting for a client fetch', () => {
		queryState = {
			data: undefined,
			error: null,
			isLoading: true
		}

		const html = renderToStaticMarkup(
			<TokenYieldsSection
				tokenSymbol="ETH"
				initialData={[makeYieldRow()]}
			/>
		)

		expect(html).toContain('Tracking 1 pool, average APY 5.10%')
		expect(html).toContain('yields-table:1:paginated:10')
		expect(html).not.toContain('loader')
	})

	it('ignores null APYs when computing the average', () => {
		queryState = {
			data: [
				makeYieldRow(),
				makeYieldRow({
					pool: 'wstETH-ETH',
					project: 'Lido',
					projectslug: 'lido',
					configID: 'pool-2',
					tvl: 900000,
					apy: null
				})
			],
			error: null,
			isLoading: false
		}

		const html = renderToStaticMarkup(<TokenYieldsSection tokenSymbol="ETH" />)

		expect(html).toContain('Tracking 2 pools, average APY 5.10%')
	})

	it('shows a loader while data is loading', () => {
		queryState = {
			data: [],
			error: null,
			isLoading: true
		}

		const html = renderToStaticMarkup(<TokenYieldsSection tokenSymbol="ETH" />)

		expect(html).toContain('loader')
		expect(html).toContain('min-h-[80dvh]')
	})

	it('shows an error state when the fetch fails', () => {
		queryState = {
			data: [],
			error: new Error('Failed to fetch yields data'),
			isLoading: false
		}

		const html = renderToStaticMarkup(<TokenYieldsSection tokenSymbol="ETH" />)

		expect(html).toContain('Failed to fetch yields data')
		expect(html).toContain('min-h-[80dvh]')
	})

	it('shows an empty state when no pools match the token', () => {
		const html = renderToStaticMarkup(<TokenYieldsSection tokenSymbol="ETH" />)

		expect(html).toContain('No yield pools found.')
		expect(html).toContain('min-h-[80dvh]')
	})

	it('shows the filtered empty state when selectors remove all rows', () => {
		queryState = {
			data: [makeYieldRow()],
			error: null,
			isLoading: false
		}
		yieldsQueryState = {
			...yieldsQueryState,
			minTvl: 2000000
		}

		const html = renderToStaticMarkup(<TokenYieldsSection tokenSymbol="ETH" />)

		expect(html).toContain('No pools match current filters')
		expect(html).not.toContain('yields-table:')
	})

	it('uses canonical token matching for include filters without substring false positives', () => {
		queryState = {
			data: [
				{
					pool: 'USDC-LINK',
					project: 'Aave',
					projectslug: 'aave',
					configID: 'pool-1',
					chains: ['Ethereum'],
					tvl: 1000000,
					apy: 5.1
				}
			],
			error: null,
			isLoading: false
		}
		yieldsQueryState = {
			...yieldsQueryState,
			includeTokens: ['IN']
		}

		const html = renderToStaticMarkup(<TokenYieldsSection tokenSymbol="LINK" />)

		expect(html).not.toContain('yields-table:1')
	})

	it('uses cached canonical token variants for exclude filters', () => {
		queryState = {
			data: [
				{
					pool: 'WBTC-ETH',
					project: 'Aave',
					projectslug: 'aave',
					configID: 'pool-1',
					chains: ['Ethereum'],
					tvl: 1000000,
					apy: 5.1
				}
			],
			error: null,
			isLoading: false
		}
		yieldsQueryState = {
			...yieldsQueryState,
			excludeTokens: ['BTC']
		}

		const html = renderToStaticMarkup(<TokenYieldsSection tokenSymbol="BTC" />)

		expect(html).not.toContain('yields-table:1')
	})

	it('does not show reset filters when only column visibility query params are active', () => {
		queryState = {
			data: [
				{
					pool: 'stETH-ETH',
					project: 'Aave',
					projectslug: 'aave',
					configID: 'pool-1',
					chains: ['Ethereum'],
					tvl: 1000000,
					apy: 5.1
				}
			],
			error: null,
			isLoading: false
		}
		routerState = {
			...routerState,
			query: {
				showMedianApy: 'true'
			}
		}

		const html = renderToStaticMarkup(<TokenYieldsSection tokenSymbol="ETH" />)

		expect(html).not.toContain('Reset filters')
	})

	it('shows reset filters when a real filter query param is active', () => {
		queryState = {
			data: [
				{
					pool: 'stETH-ETH',
					project: 'Aave',
					projectslug: 'aave',
					configID: 'pool-1',
					chains: ['Ethereum'],
					tvl: 1000000,
					apy: 5.1
				}
			],
			error: null,
			isLoading: false
		}
		routerState = {
			...routerState,
			query: {
				minApy: '4'
			}
		}

		const html = renderToStaticMarkup(<TokenYieldsSection tokenSymbol="ETH" />)

		expect(html).toContain('Reset filters')
	})
})
