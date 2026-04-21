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
			totalCollateralMaxBorrowUsd: 1500,
			totalCollateralBorrowedDebtUsd: null,
			totalMinBadDebtAtPriceZeroUsd: 400,
			exposureCount: 2,
			protocolCount: 2,
			chainCount: 1,
			borrowedDebtKnownCount: 1,
			borrowedDebtUnknownCount: 1,
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
				collateralMaxBorrowUsd: 1000,
				collateralBorrowedDebtUsd: 400,
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
				collateralMaxBorrowUsd: 500,
				collateralBorrowedDebtUsd: null,
				minBadDebtAtPriceZeroUsd: null,
				minBadDebtAtPriceZeroCoverage: 'unavailable'
			}
		],
		methodologies: {
			asset: 'Asset methodology',
			collateralMaxBorrowUsd: 'Max borrow methodology',
			collateralBorrowedDebtUsd: 'Borrowed debt methodology',
			minBadDebtAtPriceZeroUsd: 'Zero-price bad debt methodology'
		}
	},
	limitations: ['Borrowed debt totals may be unavailable.']
})

import { TokenRisksSection } from './TokenRisksSection'

describe('TokenRisksSection', () => {
	it('renders the new exposure summary from preloaded risk data', () => {
		const html = renderToStaticMarkup(<TokenRisksSection tokenSymbol="USDC" riskData={createRiskData()} />)

		expect(html).toContain('How much debt can be issued against USDC as collateral across lending protocols')
		expect(html).toContain('Total max borrow against USDC')
		expect(html).toContain('$1,500')
		expect(html).toContain('Debt already borrowed against USDC')
		expect(html).toContain('Unavailable')
		expect(html).toContain('1 exposure does not report collateral-attributed borrowed debt.')
		expect(html).toContain('Minimum known bad debt if USDC goes to $0')
		expect(html).toContain('$400')
		expect(html).toContain('Shown as a minimum known amount because some exposures do not report this metric yet.')
	})

	it('shows methodology, limitations, and the exposure details disclosure', () => {
		const html = renderToStaticMarkup(<TokenRisksSection tokenSymbol="USDC" riskData={createRiskData()} />)

		expect(html).toContain('Showing collateral exposure for USDC on')
		expect(html).toContain('Borrowed debt totals may be unavailable.')
		expect(html).toContain('Show exposure details')
		expect(html).toContain('paginated-table:2')
		expect(html).toContain('Asset|Asset methodology')
		expect(html).toContain('Max Borrow|Max borrow methodology')
		expect(html).toContain('Borrowed Debt|Borrowed debt methodology')
		expect(html).toContain('Min Bad Debt at $0|Zero-price bad debt methodology')
		expect(html).toContain(
			'Min Bad Debt at $0</span> is the minimum known bad debt if the collateral asset price goes to zero; null rows are excluded from this total rather than treated as zero.'
		)
		expect(html).toContain(
			'Rows with unavailable borrowed-debt values are left blank at the API level rather than being filled with zero, and zero-price bad-debt totals remain lower bounds when a row is marked partial.'
		)
	})

	it('prioritizes protocols by total max borrow', () => {
		const html = renderToStaticMarkup(<TokenRisksSection tokenSymbol="USDC" riskData={createRiskData()} />)

		expect(html.indexOf('Aave V3')).toBeLessThan(html.indexOf('Morpho Blue'))
		expect(html).toContain('$1,000 max borrow')
		expect(html).toContain('$400 borrowed debt')
		expect(html).toContain('$400 min bad debt at $0')
		expect(html).toContain('Unavailable min bad debt at $0')
	})

	it('uses onchain copy when multiple scoped chains are present', () => {
		const riskData = createRiskData()
		riskData.scopeCandidates = riskData.candidates

		const html = renderToStaticMarkup(<TokenRisksSection tokenSymbol="LINK" riskData={riskData} />)

		expect(html).toContain('<span class="font-medium text-(--text-primary)">onchain</span>')
	})

	it('returns nothing when there are no exposure rows', () => {
		const riskData = createRiskData()
		riskData.exposures.rows = []
		riskData.exposures.summary = {
			totalCollateralMaxBorrowUsd: 0,
			totalCollateralBorrowedDebtUsd: null,
			totalMinBadDebtAtPriceZeroUsd: null,
			exposureCount: 0,
			protocolCount: 0,
			chainCount: 0,
			borrowedDebtKnownCount: 0,
			borrowedDebtUnknownCount: 0,
			minBadDebtKnownCount: 0,
			minBadDebtUnknownCount: 0
		}

		const html = renderToStaticMarkup(<TokenRisksSection tokenSymbol="AAVE" riskData={riskData} />)

		expect(html).toBe('')
	})

	it('shows partial zero-price bad debt labels and unavailable totals when coverage is incomplete', () => {
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

		expect(html).toContain('Shown as a minimum known amount because some exposures do not report this metric yet.')
		expect(html).toContain('$50 (partial) min bad debt at $0')
	})

	it('shows unavailable zero-price bad debt totals when no exposures report the metric', () => {
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

		expect(html).toContain('No exposures in this scope report zero-price bad-debt data yet.')
		expect(html).toContain('Unavailable min bad debt at $0')
	})
})
