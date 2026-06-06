import { flexRender } from '@tanstack/react-table'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

const { DynamicPaginatedTable, paginatedTableCalls } = vi.hoisted(() => {
	const paginatedTableCalls: Array<{
		availablePageSizeOptions: number[]
		pageCount: number
		pageIndex: number
		pageSize: number
		renderedNames: string[]
		rowCount: number
	}> = []

	const DynamicPaginatedTable = ({ table, pageSizeOptions }: any) => {
		const rows = table.getRowModel().rows
		const rowCount = table.getRowCount()
		const { pageIndex, pageSize } = table.getState().pagination
		const availablePageSizeOptions = pageSizeOptions.filter((pageSizeOption: number) => pageSizeOption <= rowCount)
		const pageCount = Math.max(1, table.getPageCount())

		paginatedTableCalls.push({
			availablePageSizeOptions,
			pageCount,
			pageIndex,
			pageSize,
			renderedNames: rows.map((row: any) => row.original.name),
			rowCount
		})

		return (
			<div>
				{rows.map((row: any) => (
					<div key={row.id}>
						{row.getVisibleCells().map((cell: any) => (
							<span key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</span>
						))}
					</div>
				))}
				{rowCount > 10 && pageCount > 1 ? <span>{`Page ${pageIndex + 1} of ${pageCount}`}</span> : null}
				{rowCount > 10 && availablePageSizeOptions.length >= 2 ? <span>Rows per page</span> : null}
			</div>
		)
	}

	return { DynamicPaginatedTable, paginatedTableCalls }
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
	data: [],
	error: null,
	isLoading: false
}

vi.mock('next/router', () => ({
	useRouter: () => ({ asPath: '/token/link' })
}))

vi.mock('@ariakit/react', () => ({
	useDialogStore: () => ({ show: vi.fn() })
}))

vi.mock('next/dynamic', () => ({
	default: () => DynamicPaginatedTable
}))

vi.mock('@tanstack/react-query', () => ({
	useQuery: () => queryState
}))

vi.mock('~/components/ButtonStyled/CsvButton', () => ({
	CSVDownloadButton: () => <button type="button">download csv</button>
}))

vi.mock('~/components/Link', () => ({
	BasicLink: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
		<a href={href} className={className}>
			{children}
		</a>
	)
}))

vi.mock('~/components/Loaders', () => ({
	LocalLoader: () => <div>loader</div>
}))

vi.mock('~/components/Switch', () => ({
	Switch: ({ label }: { label: string }) => <div>{label}</div>
}))

vi.mock('~/components/Table/SortIcon', () => ({
	SortIcon: ({ dir }: { dir: string | boolean }) => <span>{String(dir)}</span>
}))

vi.mock('~/components/Table/utils', () => ({
	prepareTableCsv: vi.fn(() => ({ filename: 'token-usage', rows: [] }))
}))

vi.mock('~/components/Table/PaginatedTable', () => ({
	PaginatedTable: DynamicPaginatedTable
}))

vi.mock('~/components/TokenLogo', () => ({
	TokenLogo: ({ alt }: { alt: string }) => <span>{alt}</span>
}))

vi.mock('~/containers/Subscription/SignInModal', () => ({
	SignInModal: () => <div>sign-in-modal</div>
}))

vi.mock('~/containers/Subscription/auth', () => ({
	useAuthContext: () => authState
}))

import { TokenUsageSection } from '../TokenUsageSection'
import { buildTokenUsageRows, filterTokenUsageRows } from '../TokenUsageSection.utils'

afterEach(() => {
	authState = {
		authorizedFetch: vi.fn(),
		hasActiveSubscription: true,
		isAuthenticated: true,
		loaders: { userLoading: false }
	}
	queryState = {
		data: [],
		error: null,
		isLoading: false
	}
	paginatedTableCalls.length = 0
	vi.clearAllMocks()
})

describe('TokenUsageSection', () => {
	it('renders token usage rows for subscribers', () => {
		queryState = {
			data: [
				{ name: 'Aave', category: 'Lending', amountUsd: 123456, slug: 'aave', logo: 'https://example.com/aave.png' }
			],
			error: null,
			isLoading: false
		}

		const html = renderToStaticMarkup(<TokenUsageSection tokenSymbol="link" />)

		expect(html).toContain('Token Usage')
		expect(html).toContain('Aave')
		expect(html).toContain('/protocol/aave')
		expect(html).toContain('Include CEXs')
	})

	it('shows a sign-in gate for unauthenticated users', () => {
		authState = {
			authorizedFetch: vi.fn(),
			hasActiveSubscription: false,
			isAuthenticated: false,
			loaders: { userLoading: false }
		}

		const html = renderToStaticMarkup(<TokenUsageSection tokenSymbol="link" />)

		expect(html).toContain('active subscription')
	})

	it('shows a subscription link for authenticated users without a subscription', () => {
		authState = {
			authorizedFetch: vi.fn(),
			hasActiveSubscription: false,
			isAuthenticated: true,
			loaders: { userLoading: false }
		}

		const html = renderToStaticMarkup(<TokenUsageSection tokenSymbol="link" />)

		expect(html).toContain('/subscription?returnUrl=%2Ftoken%2Flink')
	})

	it('shows an empty state when no usage rows remain', () => {
		const html = renderToStaticMarkup(<TokenUsageSection tokenSymbol="link" />)

		expect(html).toContain('No token usage entries found.')
	})

	it('shows the query error message when the fetch fails', () => {
		queryState = {
			data: [],
			error: new Error('Failed to fetch token usage data'),
			isLoading: false
		}

		const html = renderToStaticMarkup(<TokenUsageSection tokenSymbol="link" />)

		expect(html).toContain('Failed to fetch token usage data')
	})

	it('filters CEX rows unless the embedded CEX toggle is enabled', () => {
		queryState = {
			data: [
				{ name: 'Aave', category: 'Lending', amountUsd: 1 },
				{ name: 'Binance', category: 'CEX', amountUsd: 2 }
			],
			error: null,
			isLoading: false
		}

		const defaultHtml = renderToStaticMarkup(<TokenUsageSection tokenSymbol="link" />)
		const includeCexHtml = renderToStaticMarkup(
			<TokenUsageSection tokenSymbol="link" initialIncludeCentralizedExchanges />
		)

		expect(defaultHtml).toContain('Aave')
		expect(defaultHtml).not.toContain('Binance')
		expect(includeCexHtml).toContain('Binance')
	})

	it('renders paginated rows and exposes rows-per-page options', () => {
		queryState = {
			data: Array.from({ length: 22 }, (_, index) => ({
				name: `Protocol ${index + 1}`,
				category: 'Lending',
				amountUsd: index + 1
			})),
			error: null,
			isLoading: false
		}

		const defaultHtml = renderToStaticMarkup(<TokenUsageSection tokenSymbol="link" />)
		renderToStaticMarkup(<TokenUsageSection tokenSymbol="link" initialPageSize={30} />)
		const defaultTableCall = paginatedTableCalls[0]
		const expandedTableCall = paginatedTableCalls[1]

		expect(defaultTableCall?.renderedNames).toContain('Protocol 13')
		expect(defaultTableCall?.renderedNames).not.toContain('Protocol 11')
		expect(defaultTableCall?.renderedNames).not.toContain('Protocol 10')
		expect(defaultTableCall?.renderedNames).not.toContain('Protocol 3')
		expect(defaultTableCall?.renderedNames).not.toContain('Protocol 2')
		expect(defaultTableCall?.renderedNames).not.toContain('Protocol 1')
		expect(defaultHtml).toContain('Rows per page')
		expect(defaultTableCall?.availablePageSizeOptions).toEqual([10, 20])
		expect(defaultTableCall?.pageSize).toBe(10)
		expect(defaultHtml).toContain('Page 1 of 3')
		expect(expandedTableCall?.renderedNames).toContain('Protocol 2')
		expect(expandedTableCall?.renderedNames).toContain('Protocol 11')
		expect(expandedTableCall?.renderedNames).toContain('Protocol 12')
	})
})

describe('TokenUsageSection helpers', () => {
	it('builds table rows by summing usage amounts', () => {
		expect(
			buildTokenUsageRows([
				{
					name: 'Aave',
					category: 'Lending',
					amountUsd: { ethereum: 100, base: 25 },
					logo: 'https://example.com/aave.png',
					slug: 'aave'
				}
			])
		).toEqual([
			{
				name: 'Aave',
				category: 'Lending',
				amountUsd: 125,
				logo: 'https://example.com/aave.png',
				slug: 'aave',
				misrepresentedTokens: undefined
			}
		])
	})

	it('drops misrepresented rows and optional CEX rows from the table data', () => {
		expect(
			filterTokenUsageRows(
				[
					{ name: 'Aave', category: 'Lending', amountUsd: 1 },
					{ name: 'Binance', category: 'CEX', amountUsd: 2 },
					{ name: 'Bad Row', category: 'DEX', amountUsd: 3, misrepresentedTokens: true }
				],
				false
			)
		).toEqual([{ name: 'Aave', category: 'Lending', amountUsd: 1 }])
	})
})
