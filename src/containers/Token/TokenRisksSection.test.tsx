import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import type { TokenRiskResponse } from './tokenRisk.types'

vi.mock('~/components/Icon', () => ({
	Icon: ({ name }: { name: string }) => <span>{name}</span>
}))

vi.mock('~/components/TokenLogo', () => ({
	TokenLogo: ({ name }: { name: string }) => <span>{`logo:${name}`}</span>
}))

vi.mock('~/components/Tooltip', () => ({
	Tooltip: ({ children, className }: { children: ReactNode; className?: string }) => (
		<span className={className}>{children}</span>
	)
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
	borrowCaps: {
		summary: {
			totalBorrowCapUsd: 1000,
			totalBorrowedUsd: 400,
			remainingCapUsd: 600,
			capUtilization: 0.4,
			protocolCount: 1,
			chainCount: 1,
			marketCount: 1
		},
		rows: [
			{
				protocol: 'aave-v3',
				protocolDisplayName: 'Aave V3',
				chain: 'ethereum',
				chainDisplayName: 'Ethereum',
				debtSymbol: 'USDC',
				borrowCapUsd: 1000,
				debtTotalBorrowedUsd: 400,
				debtTotalSupplyUsd: 800,
				remainingCapUsd: 600,
				availableToBorrowUsd: 200,
				debtUtilization: 0.5,
				eligibleCollateralCount: 2,
				eligibleCollateralSymbols: ['WBTC', 'wstETH'],
				market: 'core-market'
			}
		],
		methodologies: {
			borrowCapUsd: 'Borrow cap methodology',
			debtTotalBorrowedUsd: 'Borrowed methodology',
			debtUtilization: 'Utilization methodology',
			availableToBorrowUsd: 'Available methodology'
		}
	},
	collateralRisk: {
		summary: {
			totalBorrowableUsd: 500,
			routeCount: 1,
			isolatedRouteCount: 1,
			minLiquidationBuffer: 0.08,
			maxLiquidationBuffer: 0.08
		},
		rows: [
			{
				protocol: 'aave-v3',
				protocolDisplayName: 'Aave V3',
				chain: 'ethereum',
				chainDisplayName: 'Ethereum',
				debtSymbol: 'WBTC',
				debtTotalSupplyUsd: 800,
				debtTotalBorrowedUsd: 300,
				maxLtv: 0.7,
				liquidationThreshold: 0.78,
				liquidationPenalty: 0.04,
				liquidationBuffer: 0.08,
				borrowApy: 0.02,
				isolationMode: true,
				debtCeilingUsd: 1000,
				availableToBorrowUsd: 500,
				market: 'core-market'
			}
		],
		methodologies: {
			availableToBorrowUsd: 'Available methodology',
			maxLtv: 'Max LTV methodology',
			liquidationThreshold: 'Threshold methodology',
			liquidationPenalty: 'Penalty methodology',
			isolationMode: 'Isolation methodology',
			debtCeilingUsd: 'Ceiling methodology'
		}
	},
	selectedChainRisk: null,
	limitations: ['Borrow caps are not a full risk rating.']
})

import { TokenRisksSection } from './TokenRisksSection'

describe('TokenRisksSection', () => {
	it('renders the debt-side summary from preloaded risk data', () => {
		const html = renderToStaticMarkup(<TokenRisksSection tokenSymbol="USDC" riskData={createRiskData()} />)

		expect(html).toContain('Total USDC available to borrow')
		expect(html).toContain('$200')
		expect(html).toContain('$400 borrowed across these lending markets')
		expect(html).toContain('Aave V3')
		expect(html).toContain('$200 available ($400 borrowed / $1,000 cap)')
		expect(html).toContain('Ethereum')
		expect(html).toContain('How much USDC is currently available to borrow across lending protocols')
	})

	it('shows methodology and both detail disclosures when data exists', () => {
		const html = renderToStaticMarkup(<TokenRisksSection tokenSymbol="USDC" riskData={createRiskData()} />)

		expect(html).toContain('Showing debt-side borrowing capacity for USDC on')
		expect(html).toContain('Borrow caps are not a full risk rating.')
		expect(html).toContain('Show collateral-side details')
		expect(html).toContain('Show borrow-cap details')
		expect(html).toContain('paginated-table:1')
		expect(html).toContain('Borrow cap equals borrowed plus remaining cap headroom')
		expect(html).toContain('Available|Available methodology')
		expect(html).toContain('Max LTV|Max LTV methodology')
	})

	it('uses onchain copy when multiple scoped chains are present', () => {
		const riskData = createRiskData()
		riskData.scopeCandidates = riskData.candidates

		const html = renderToStaticMarkup(<TokenRisksSection tokenSymbol="LINK" riskData={riskData} />)

		expect(html).toContain('<span class="font-medium text-(--text-primary)">onchain</span>')
	})

	it('hides empty detail disclosures', () => {
		const riskData = createRiskData()
		riskData.collateralRisk.rows = []
		riskData.collateralRisk.summary = {
			totalBorrowableUsd: 0,
			routeCount: 0,
			isolatedRouteCount: 0,
			minLiquidationBuffer: null,
			maxLiquidationBuffer: null
		}
		riskData.borrowCaps.rows = []
		riskData.borrowCaps.summary = {
			totalBorrowCapUsd: 0,
			totalBorrowedUsd: 0,
			remainingCapUsd: 0,
			capUtilization: null,
			protocolCount: 0,
			chainCount: 0,
			marketCount: 0
		}

		const html = renderToStaticMarkup(<TokenRisksSection tokenSymbol="AAVE" riskData={riskData} />)

		expect(html).not.toContain('Show collateral-side details')
		expect(html).not.toContain('Show borrow-cap details')
	})

	it('returns nothing when there are no debt-side protocol summaries', () => {
		const riskData = createRiskData()
		riskData.borrowCaps.rows = []
		riskData.borrowCaps.summary = {
			totalBorrowCapUsd: 0,
			totalBorrowedUsd: 0,
			remainingCapUsd: 0,
			capUtilization: null,
			protocolCount: 0,
			chainCount: 0,
			marketCount: 0
		}

		const html = renderToStaticMarkup(<TokenRisksSection tokenSymbol="AAVE" riskData={riskData} />)

		expect(html).toBe('')
	})
})
