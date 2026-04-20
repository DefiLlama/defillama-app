import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

const testState = vi.hoisted(() => {
	const createBaseTokenRiskData = () => ({
		candidates: [
			{ key: 'ethereum:0xa0b8', chain: 'ethereum', address: '0xa0b8', displayName: 'Ethereum' },
			{ key: 'base:0x8335', chain: 'base', address: '0x8335', displayName: 'Base' }
		],
		scopeCandidates: [{ key: 'ethereum:0xa0b8', chain: 'ethereum', address: '0xa0b8', displayName: 'Ethereum' }],
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

	return {
		createBaseTokenRiskData,
		tokenRiskState: {
			data: createBaseTokenRiskData(),
			error: null as Error | null,
			isLoading: false
		}
	}
})

const { createBaseTokenRiskData, tokenRiskState } = testState

vi.mock('~/components/Icon', () => ({
	Icon: ({ name }: { name: string }) => <span>{name}</span>
}))

vi.mock('~/components/TokenLogo', () => ({
	TokenLogo: ({ name }: { name: string }) => <span>{`logo:${name}`}</span>
}))

vi.mock('~/components/Loaders', () => ({
	LocalLoader: () => <div>loader</div>
}))

vi.mock('~/components/Table/PaginatedTable', () => ({
	PaginatedTable: ({
		table
	}: {
		table: { getRowModel: () => { rows: Array<{ original: Record<string, unknown> }> } }
	}) => (
		<div>
			{`paginated-table:${table.getRowModel().rows.length}`}
			{table
				.getRowModel()
				.rows.map((row) => `${row.original.protocolDisplayName ?? ''}|${row.original.chainDisplayName ?? ''}`)
				.join(',')}
		</div>
	)
}))

vi.mock('./useTokenRisk', () => ({
	useTokenRisk: () => tokenRiskState
}))

afterEach(() => {
	tokenRiskState.error = null
	tokenRiskState.isLoading = false
	tokenRiskState.data = createBaseTokenRiskData()
	vi.clearAllMocks()
})

import { TokenRisksSection } from './TokenRisksSection'

describe('TokenRisksSection', () => {
	it('shows a loader while token risk data is loading', () => {
		tokenRiskState.data = undefined
		tokenRiskState.error = null
		tokenRiskState.isLoading = true

		const html = renderToStaticMarkup(<TokenRisksSection tokenSymbol="USDC" geckoId="usdc" />)

		expect(html).toContain('loader')
		expect(html).toContain('Risks')
	})

	it('shows a static unsupported state when the token has no CoinGecko id', () => {
		const html = renderToStaticMarkup(<TokenRisksSection tokenSymbol="USDC" geckoId={null} />)

		expect(html).toContain('no CoinGecko id')
	})

	it('renders the borrow-caps view by default with summaries above the table', () => {
		const html = renderToStaticMarkup(<TokenRisksSection tokenSymbol="USDC" geckoId="usdc" />)

		expect(html).toContain('Borrow Caps')
		expect(html).toContain('All chains')
		expect(html).toContain('Total Borrow Cap')
		expect(html).toContain('Aave V3|Ethereum')
		expect(html).toContain('paginated-table:1')
		expect(html.indexOf('Total Borrow Cap')).toBeLessThan(html.indexOf('paginated-table:1'))
	})

	it('shows an unsupported resolved-asset state when no candidates are available', () => {
		tokenRiskState.data = {
			...tokenRiskState.data,
			candidates: []
		}

		const html = renderToStaticMarkup(<TokenRisksSection tokenSymbol="USDC" geckoId="usdc" />)

		expect(html).toContain('does not resolve to a supported lending-market asset')
	})

	it('falls back to candidates when scopeCandidates is missing', () => {
		const nextData = createBaseTokenRiskData()
		delete (nextData as { scopeCandidates?: unknown }).scopeCandidates
		tokenRiskState.data = nextData

		const html = renderToStaticMarkup(<TokenRisksSection tokenSymbol="USDC" geckoId="usdc" />)

		expect(html).toContain('All chains')
		expect(html).toContain('Ethereum')
	})

	it('explains why the borrow-caps tab is empty when no debt markets exist', () => {
		tokenRiskState.data = {
			...createBaseTokenRiskData(),
			borrowCaps: {
				...createBaseTokenRiskData().borrowCaps,
				summary: {
					totalBorrowCapUsd: 0,
					totalBorrowedUsd: 0,
					remainingCapUsd: 0,
					capUtilization: null,
					protocolCount: 0,
					chainCount: 0,
					marketCount: 0
				},
				rows: []
			}
		}

		const html = renderToStaticMarkup(<TokenRisksSection tokenSymbol="AAVE" geckoId="aave" />)

		expect(html).toContain('No capped borrow markets currently support this token as debt')
	})
})
