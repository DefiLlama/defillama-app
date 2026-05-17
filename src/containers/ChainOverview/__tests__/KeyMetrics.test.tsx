import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { KeyMetrics } from '../KeyMetrics'
import type { IChainOverviewData } from '../types'

vi.mock('~/components/Icon', () => ({
	Icon: () => null
}))

vi.mock('~/components/Tooltip', () => ({
	Tooltip: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children)
}))

vi.mock('~/components/BuyOnLlamaswap', () => ({
	BuyOnLlamaswap: () => null
}))

vi.mock('../KeyMetricsPngExport', () => ({
	KeyMetricsPngExportButton: () => null
}))

const baseProps: React.ComponentProps<typeof KeyMetrics> = {
	metadata: { name: 'MegaETH' } as IChainOverviewData['metadata'],
	stablecoins: null,
	chainStablecoins: null,
	chainFees: { total24h: null, feesGenerated24h: null, topProtocolsChart: null, totalREV24h: null },
	chainRevenue: { total24h: null },
	chainIncentives: { emissions24h: null, emissions7d: null, emissions30d: null },
	appRevenue: { total24h: null },
	appFees: { total24h: null },
	dexs: { total24h: null, total7d: null, change_7dover7d: null, dexsDominance: null, chart: null },
	perps: { total24h: null, total7d: null, change_7dover7d: null },
	inflows: null,
	users: { activeUsers: null, newUsers: null, transactions: null },
	treasury: null,
	chainRaises: null,
	chainAssets: null,
	nfts: null,
	protocols: [],
	totalValueUSD: null,
	tvlSettingsGovtokens: false,
	chainTokenInfo: {
		gecko_id: 'megaeth',
		token_symbol: 'MEGA',
		current_price: null,
		market_cap: null,
		fully_diluted_valuation: null,
		llamaswapChains: null
	}
}

describe('ChainOverview KeyMetrics', () => {
	it('renders unavailable token metrics as N/A instead of $0', () => {
		const markup = renderToStaticMarkup(<KeyMetrics {...baseProps} />)

		expect(markup).toContain('$MEGA Price')
		expect(markup).toContain('$MEGA Market Cap')
		expect(markup).toContain('$MEGA FDV')
		expect(markup).toContain('N/A')
		expect(markup).not.toContain('$0</span>')
	})

	it('preserves legitimate zero values for token metrics', () => {
		const markup = renderToStaticMarkup(
			<KeyMetrics
				{...baseProps}
				chainTokenInfo={{
					...baseProps.chainTokenInfo!,
					current_price: 0,
					market_cap: 0,
					fully_diluted_valuation: 0
				}}
			/>
		)

		expect(markup).toContain('$0')
		expect(markup).not.toContain('N/A')
	})
})
