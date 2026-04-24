import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import type { TokenRiskResponse } from './tokenRisk.types'

vi.mock('~/components/Icon', () => ({
	Icon: ({ name }: { name: string }) => <span>{name}</span>
}))

vi.mock('~/components/TokenLogo', () => ({
	TokenLogo: ({ name }: { name: string }) => <span>{`logo:${name}`}</span>
}))

vi.mock('~/components/Table/PaginatedTable', () => ({
	PaginatedTable: ({
		table
	}: {
		table: {
			getHeaderGroups: () => Array<{
				headers: Array<{ id: string; column: { columnDef: { header: unknown; meta?: { headerHelperText?: string } } } }>
			}>
			getRowModel: () => { rows: Array<{ original: Record<string, unknown> }> }
		}
	}) => (
		<div>
			{table
				.getHeaderGroups()
				.flatMap((group) =>
					group.headers.map(
						(header) =>
							`${String(header.column.columnDef.header)}|${header.column.columnDef.meta?.headerHelperText ?? ''}`
					)
				)
				.join(',')}
			{`paginated-table:${table.getRowModel().rows.length}`}
			{table
				.getRowModel()
				.rows.map((row) => `${row.original.protocolDisplayName ?? ''}|${row.original.chainDisplayName ?? ''}`)
				.join(',')}
		</div>
	)
}))

const createRiskData = (): TokenRiskResponse => ({
	candidates: [
		{ key: 'ethereum:0xa0b8', chain: 'ethereum', address: '0xa0b8', displayName: 'Ethereum' },
		{ key: 'base:0x8335', chain: 'base', address: '0x8335', displayName: 'Base' }
	],
	scopeCandidates: [{ key: 'ethereum:0xa0b8', chain: 'ethereum', address: '0xa0b8', displayName: 'Ethereum' }],
	selectedCandidateKey: null,
	exposures: {
		summary: {
			totalCurrentMaxBorrowUsd: 1500,
			totalMinBadDebtAtPriceZeroUsd: 400,
			exposureCount: 2,
			protocolCount: 2,
			chainCount: 1,
			minBadDebtKnownCount: 1,
			minBadDebtUnknownCount: 1
		},
		rows: [
			{
				protocol: 'aave-v3',
				protocolDisplayName: 'Aave V3',
				chain: 'ethereum',
				chainDisplayName: 'Ethereum',
				assetSymbol: 'USDC',
				assetAddress: '0xa0b8',
				currentMaxBorrowUsd: 1000,
				minBadDebtAtPriceZeroUsd: 400,
				minBadDebtAtPriceZeroCoverage: 'known'
			},
			{
				protocol: 'morpho-blue',
				protocolDisplayName: 'Morpho Blue',
				chain: 'ethereum',
				chainDisplayName: 'Ethereum',
				assetSymbol: 'USDC',
				assetAddress: '0xa0b8',
				currentMaxBorrowUsd: 500,
				minBadDebtAtPriceZeroUsd: null,
				minBadDebtAtPriceZeroCoverage: 'unavailable'
			}
		],
		methodologies: {
			asset: 'Asset methodology',
			currentMaxBorrowUsd: 'Liquidity max borrow methodology',
			minBadDebtAtPriceZeroUsd: 'Zero-price bad debt methodology'
		}
	},
	limitations: ['Bad debt at $0 is a lower bound when some contributing markets return null for zero-price bad debt.']
})

import { TokenRisksSection } from './TokenRisksSection'

describe('TokenRisksSection', () => {
	it('renders the combined maximum possible exposure headline from preloaded risk data', () => {
		const html = renderToStaticMarkup(<TokenRisksSection tokenSymbol="USDC" riskData={createRiskData()} />)

		expect(html).toContain('How much debt can be issued against USDC as collateral across lending protocols')
		expect(html).toContain('Maximum possible exposure to USDC')
		expect(html).toContain('$1,900')
		expect(html).toContain('$1,500 (max additional borrows against USDC)')
		expect(html).toContain('$400 (bad debt if USDC was hacked now)')
		expect(html).not.toContain('Debt already borrowed against USDC')
		expect(html).not.toContain('borrowed debt')
	})

	it('shows methodology, limitations, and the exposure details disclosure', () => {
		const html = renderToStaticMarkup(<TokenRisksSection tokenSymbol="USDC" riskData={createRiskData()} />)

		expect(html).toContain('Showing collateral exposure for USDC on')
		expect(html).toContain(
			'Bad debt at $0 is a lower bound when some contributing markets return null for zero-price bad debt.'
		)
		expect(html).toContain('Show exposure details')
		expect(html).toContain('paginated-table:2')
		expect(html).toContain('Asset|Asset methodology')
		expect(html).toContain('Max Borrowable|Liquidity max borrow methodology')
		expect(html).toContain('Bad Debt at $0|Zero-price bad debt methodology')
		expect(html).toContain(
			'Bad Debt at $0</span> is the minimum known bad debt if the collateral asset price goes to zero'
		)
		expect(html).toContain('Bad debt at $0 totals remain lower bounds when a row is marked partial.')
		expect(html).not.toContain('Borrowed Debt|')
	})

	it('prioritizes protocols by total max borrowable', () => {
		const html = renderToStaticMarkup(<TokenRisksSection tokenSymbol="USDC" riskData={createRiskData()} />)

		expect(html.indexOf('Aave V3')).toBeLessThan(html.indexOf('Morpho Blue'))
		expect(html).toContain(
			'$1,400 at-risk exposure = $400 bad debt if hacked + $1,000 additional borrowable against USDC'
		)
		expect(html).toContain(
			'$500 at-risk exposure = Unavailable bad debt if hacked + $500 additional borrowable against USDC'
		)
	})

	it('uses onchain copy when multiple scoped chains are present', () => {
		const riskData = createRiskData()
		riskData.scopeCandidates = riskData.candidates

		const html = renderToStaticMarkup(<TokenRisksSection tokenSymbol="LINK" riskData={riskData} />)

		expect(html).toContain('<span class="font-medium text-(--text-primary)">onchain</span>')
	})

	it('shows a focusable chain breakdown trigger for multi-chain protocol summaries', () => {
		const riskData = createRiskData()
		riskData.exposures.rows = [
			riskData.exposures.rows[0],
			{
				...riskData.exposures.rows[0],
				chain: 'base',
				chainDisplayName: 'Base',
				currentMaxBorrowUsd: 300,
				minBadDebtAtPriceZeroUsd: 25
			}
		]

		const html = renderToStaticMarkup(<TokenRisksSection tokenSymbol="USDC" riskData={riskData} />)

		expect(html).toContain('Show 2 chains exposure breakdown by chain')
		expect(html).toContain('2 chains')
	})

	it('returns nothing when there are no exposure rows', () => {
		const riskData = createRiskData()
		riskData.exposures.rows = []
		riskData.exposures.summary = {
			totalCurrentMaxBorrowUsd: 0,
			totalMinBadDebtAtPriceZeroUsd: null,
			exposureCount: 0,
			protocolCount: 0,
			chainCount: 0,
			minBadDebtKnownCount: 0,
			minBadDebtUnknownCount: 0
		}

		const html = renderToStaticMarkup(<TokenRisksSection tokenSymbol="AAVE" riskData={riskData} />)

		expect(html).toBe('')
	})

	it('shows partial bad-debt labels and unavailable totals when coverage is incomplete', () => {
		const riskData = createRiskData()
		riskData.exposures.summary.totalMinBadDebtAtPriceZeroUsd = 50
		riskData.exposures.summary.minBadDebtKnownCount = 0
		riskData.exposures.summary.minBadDebtUnknownCount = 2
		riskData.exposures.rows = [
			{
				...riskData.exposures.rows[0],
				protocol: 'fluid',
				protocolDisplayName: 'Fluid',
				minBadDebtAtPriceZeroUsd: 50,
				minBadDebtAtPriceZeroCoverage: 'partial'
			},
			{
				...riskData.exposures.rows[1],
				protocol: 'fluid',
				protocolDisplayName: 'Fluid',
				minBadDebtAtPriceZeroUsd: null,
				minBadDebtAtPriceZeroCoverage: 'unavailable'
			}
		]

		const html = renderToStaticMarkup(<TokenRisksSection tokenSymbol="USDC" riskData={riskData} />)

		expect(html).toContain('$50 (partial) bad debt if hacked')
	})

	it('shows unavailable bad-debt totals when no exposures report the metric', () => {
		const riskData = createRiskData()
		riskData.exposures.summary.totalMinBadDebtAtPriceZeroUsd = null
		riskData.exposures.summary.minBadDebtKnownCount = 0
		riskData.exposures.summary.minBadDebtUnknownCount = 2
		riskData.exposures.rows = riskData.exposures.rows.map((row) => ({
			...row,
			minBadDebtAtPriceZeroUsd: null,
			minBadDebtAtPriceZeroCoverage: 'unavailable' as const
		}))

		const html = renderToStaticMarkup(<TokenRisksSection tokenSymbol="USDC" riskData={riskData} />)

		expect(html).toContain('Unavailable bad debt if hacked')
	})
})
