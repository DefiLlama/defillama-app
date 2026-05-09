import { flexRender } from '@tanstack/react-table'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

const { DynamicPaginatedTable } = vi.hoisted(() => ({
	DynamicPaginatedTable: ({ table, pageSizeOptions }: any) => {
		const rows = table.getRowModel().rows
		const rowCount = table.getRowCount()
		const { pageIndex, pageSize } = table.getState().pagination
		const availablePageSizeOptions = pageSizeOptions.filter((pageSizeOption: number) => pageSizeOption <= rowCount)
		const pageCount = Math.max(1, table.getPageCount())

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
				{rowCount > 10 && availablePageSizeOptions.length >= 2 ? (
					<label>
						<span>Rows per page</span>
						<select defaultValue={String(pageSize)}>
							{availablePageSizeOptions.map((pageSizeOption: number) => (
								<option key={pageSizeOption} value={String(pageSizeOption)}>
									{pageSizeOption}
								</option>
							))}
						</select>
					</label>
				) : null}
			</div>
		)
	}
}))

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

import { TokenUsageSection, buildTokenUsageRows, filterTokenUsageRows } from '../TokenUsageSection'

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
		expect(html).toContain('sign-in-modal')
		expect(html).toContain('min-h-[80dvh]')
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
		expect(html).toContain('min-h-[80dvh]')
	})

	it('shows the query error message when the fetch fails', () => {
		queryState = {
			data: [],
			error: new Error('Failed to fetch token usage data'),
			isLoading: false
		}

		const html = renderToStaticMarkup(<TokenUsageSection tokenSymbol="link" />)

		expect(html).toContain('Failed to fetch token usage data')
		expect(html).toContain('min-h-[80dvh]')
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
		const expandedPageHtml = renderToStaticMarkup(<TokenUsageSection tokenSymbol="link" initialPageSize={30} />)

		expect(defaultHtml).toContain('Protocol 13')
		expect(defaultHtml).not.toContain('>Protocol 11</span>')
		expect(defaultHtml).not.toContain('>Protocol 10</span>')
		expect(defaultHtml).not.toContain('>Protocol 3</span>')
		expect(defaultHtml).not.toContain('>Protocol 2</span>')
		expect(defaultHtml).not.toContain('>Protocol 1</span>')
		expect(defaultHtml).toContain('Rows per page')
		expect(defaultHtml).toContain('<option value="10" selected="">10</option>')
		expect(defaultHtml).toContain('<option value="20">20</option>')
		expect(defaultHtml).not.toContain('<option value="30">30</option>')
		expect(defaultHtml).not.toContain('<option value="50">50</option>')
		expect(defaultHtml).toContain('Page 1 of 3')
		expect(expandedPageHtml).toContain('Protocol 2')
		expect(expandedPageHtml).toContain('Protocol 11')
		expect(expandedPageHtml).toContain('Protocol 12')
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
