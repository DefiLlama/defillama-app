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
			exposureCount: 2,
			protocolCount: 2,
			chainCount: 1,
			borrowedDebtKnownCount: 1,
			borrowedDebtUnknownCount: 1
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
				collateralBorrowedDebtUsd: 400
			},
			{
				protocol: 'morpho-blue',
				protocolDisplayName: 'Morpho Blue',
				chain: 'ethereum',
				chainDisplayName: 'Ethereum',
				assetSymbol: 'USDC',
				assetAddress: '0xa0b8',
				collateralMaxBorrowUsd: 500,
				collateralBorrowedDebtUsd: null
			}
		],
		methodologies: {
			asset: 'Asset methodology',
			collateralMaxBorrowUsd: 'Max borrow methodology',
			collateralBorrowedDebtUsd: 'Borrowed debt methodology'
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
		expect(html).toContain(
			'Rows with unavailable borrowed-debt values are left blank at the API level rather than being filled with zero.'
		)
	})

	it('prioritizes protocols by total max borrow', () => {
		const html = renderToStaticMarkup(<TokenRisksSection tokenSymbol="USDC" riskData={createRiskData()} />)

		expect(html.indexOf('Aave V3')).toBeLessThan(html.indexOf('Morpho Blue'))
		expect(html).toContain('$1,000 max borrow')
		expect(html).toContain('$400 borrowed debt')
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
			exposureCount: 0,
			protocolCount: 0,
			chainCount: 0,
			borrowedDebtKnownCount: 0,
			borrowedDebtUnknownCount: 0
		}

		const html = renderToStaticMarkup(<TokenRisksSection tokenSymbol="AAVE" riskData={riskData} />)

		expect(html).toBe('')
	})
})
