import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

const {
	DynamicLiquidationsSummaryStats,
	DynamicLiquidationsDistributionChart,
	DynamicTableWithSearch,
	liquidationsDistributionChartCalls,
	liquidationsSummaryCalls,
	tableWithSearchCalls
} = vi.hoisted(() => {
	const liquidationsDistributionChartCalls: Array<{
		defaultBreakdownMode?: string
		hideTokenSelector?: boolean
		title?: string
	}> = []
	const liquidationsSummaryCalls: Array<{ items: Array<{ label: string; value: number }> }> = []
	const tableWithSearchCalls: Array<{ csvFileName?: string; dataLength: number; placeholder?: string }> = []
	const DynamicLiquidationsSummaryStats = ({ items }: { items: Array<{ label: string; value: number }> }) => {
		liquidationsSummaryCalls.push({ items })
		return <div>Liquidations summary</div>
	}
	const DynamicLiquidationsDistributionChart = (props: {
		hideTokenSelector?: boolean
		defaultBreakdownMode?: string
		title?: string
	}) => {
		liquidationsDistributionChartCalls.push(props)
		return <div>Liquidations distribution</div>
	}
	const DynamicTableWithSearch = ({ data, leadingControls, placeholder, csvFileName }: any) => {
		tableWithSearchCalls.push({ csvFileName, dataLength: data.length, placeholder })
		return <div>{leadingControls}</div>
	}

	return {
		DynamicLiquidationsDistributionChart,
		DynamicLiquidationsSummaryStats,
		DynamicTableWithSearch,
		liquidationsDistributionChartCalls,
		liquidationsSummaryCalls,
		tableWithSearchCalls
	}
})

var authState = {
	authorizedFetch: vi.fn(),
	hasActiveSubscription: true,
	isAuthenticated: true,
	loaders: { userLoading: false }
}

var queryState: {
	data?: any
	error?: Error | null
	isLoading: boolean
} = {
	data: null,
	error: null,
	isLoading: false
}

vi.mock('next/router', () => ({
	useRouter: () => ({ asPath: '/token/wsteth' })
}))

vi.mock('@ariakit/react', () => ({
	useDialogStore: () => ({ show: vi.fn() })
}))

vi.mock('next/dynamic', () => {
	return {
		default: (_loader: () => Promise<unknown>, options?: { loading?: (props: any) => React.ReactNode }) => {
			return (props: any) => {
				if (Array.isArray(props?.items)) {
					return <DynamicLiquidationsSummaryStats {...props} />
				}

				if ('chart' in (props ?? {})) {
					return <DynamicLiquidationsDistributionChart {...props} />
				}

				if ('placeholder' in (props ?? {})) {
					return <DynamicTableWithSearch {...props} />
				}

				return options?.loading?.(props) ?? null
			}
		}
	}
})

vi.mock('@tanstack/react-query', () => ({
	useQuery: () => queryState
}))

vi.mock('~/containers/Subscription/auth', () => ({
	useAuthContext: () => authState
}))

vi.mock('~/containers/Subscription/SignInModal', () => ({
	SignInModal: () => <div>sign-in-modal</div>
}))

vi.mock('~/components/Loaders', () => ({
	LocalLoader: () => <div>loader</div>
}))

vi.mock('~/components/Icon', () => ({
	Icon: ({ name }: { name: string }) => <span>{name}</span>
}))

vi.mock('~/components/Link', () => ({
	BasicLink: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
		<a href={href} className={className}>
			{children}
		</a>
	)
}))

vi.mock('~/components/TokenLogo', () => ({
	TokenLogo: ({ alt }: { alt: string }) => <span>{alt}</span>
}))

vi.mock('~/components/Table/TableWithSearch', () => ({
	TableWithSearch: DynamicTableWithSearch
}))

vi.mock('~/containers/LiquidationsV2/Summary', () => ({
	LiquidationsSummaryStats: DynamicLiquidationsSummaryStats
}))

vi.mock('~/containers/LiquidationsV2/LiquidationsDistributionChart', () => ({
	LiquidationsDistributionChart: DynamicLiquidationsDistributionChart
}))

import { TokenLiquidationsSection } from '../TokenLiquidationsSection'

afterEach(() => {
	authState = {
		authorizedFetch: vi.fn(),
		hasActiveSubscription: true,
		isAuthenticated: true,
		loaders: { userLoading: false }
	}
	queryState = {
		data: null,
		error: null,
		isLoading: false
	}
	liquidationsDistributionChartCalls.length = 0
	liquidationsSummaryCalls.length = 0
	tableWithSearchCalls.length = 0
	vi.clearAllMocks()
})

describe('TokenLiquidationsSection', () => {
	it('renders token liquidations rows for subscribers', () => {
		queryState = {
			data: {
				tokenSymbol: 'WSTETH',
				timestamp: 1,
				positionCount: 2,
				protocolCount: 2,
				chainCount: 1,
				totalCollateralUsd: 100,
				distributionChart: { tokens: [] },
				protocolRows: [
					{ id: 'aave-v3', name: 'Aave V3', slug: 'aave-v3', positionCount: 1, chainCount: 1, totalCollateralUsd: 60 }
				],
				chainRows: [
					{
						id: 'ethereum',
						name: 'Ethereum',
						slug: 'ethereum',
						positionCount: 2,
						protocolCount: 2,
						totalCollateralUsd: 100
					}
				]
			},
			error: null,
			isLoading: false
		}

		const html = renderToStaticMarkup(<TokenLiquidationsSection tokenSymbol="wsteth" />)

		expect(html).toContain('Liquidations')
		expect(liquidationsSummaryCalls[0]?.items).toEqual(
			expect.arrayContaining([expect.objectContaining({ label: 'Collateral USD', value: 100 })])
		)
		expect(liquidationsDistributionChartCalls[0]).toMatchObject({
			defaultBreakdownMode: 'protocol',
			hideTokenSelector: true,
			title: 'WSTETH Liquidation Distribution'
		})
		expect(tableWithSearchCalls[0]).toMatchObject({
			csvFileName: 'token-liquidations-protocols-wsteth',
			dataLength: 1,
			placeholder: 'Search protocols...'
		})
	})

	it('shows a sign-in gate for unauthenticated users', () => {
		authState = {
			authorizedFetch: vi.fn(),
			hasActiveSubscription: false,
			isAuthenticated: false,
			loaders: { userLoading: false }
		}

		const html = renderToStaticMarkup(<TokenLiquidationsSection tokenSymbol="wsteth" />)

		expect(html).toContain('active subscription')
	})

	it('shows the query error message when the fetch fails', () => {
		queryState = {
			data: null,
			error: new Error('Failed to fetch token liquidations data'),
			isLoading: false
		}

		const html = renderToStaticMarkup(<TokenLiquidationsSection tokenSymbol="wsteth" />)

		expect(html).toContain('Failed to fetch token liquidations data')
	})

	it('shows an empty state when no liquidation rows remain', () => {
		queryState = {
			data: {
				tokenSymbol: 'WSTETH',
				timestamp: 1,
				positionCount: 0,
				protocolCount: 0,
				chainCount: 0,
				totalCollateralUsd: 0,
				distributionChart: { tokens: [] },
				protocolRows: [],
				chainRows: []
			},
			error: null,
			isLoading: false
		}

		const html = renderToStaticMarkup(<TokenLiquidationsSection tokenSymbol="wsteth" />)

		expect(html).toBe('')
	})
})
