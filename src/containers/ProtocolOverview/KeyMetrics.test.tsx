import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import type { IProtocolPageMetrics } from './types'

vi.mock('~/contexts/LocalStorage', () => ({
	TVL_SETTINGS: {
		POOL2: 'pool2',
		STAKING: 'staking',
		BORROWED: 'borrowed',
		DOUBLE_COUNT: 'doublecounted',
		LIQUID_STAKING: 'liquidstaking',
		VESTING: 'vesting',
		GOV_TOKENS: 'govtokens'
	},
	FEES_SETTINGS: {
		BRIBES: 'bribes',
		TOKENTAX: 'tokentax'
	},
	isTvlSettingsKey: () => false,
	useLocalStorageSettingsManager: () => [{ bribes: false, tokentax: false }]
}))

vi.mock('~/components/Icon', () => ({
	Icon: () => null
}))

vi.mock('~/components/Tooltip', () => ({
	Tooltip: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children)
}))

vi.mock('./Flag', () => ({
	Flag: () => null
}))

vi.mock('./KeyMetricsPngExport', () => ({
	KeyMetricsPngExportButton: () => null
}))

const metrics: IProtocolPageMetrics = {
	tvl: false,
	dexs: false,
	dexsNotionalVolume: false,
	perps: false,
	openInterest: false,
	optionsPremiumVolume: false,
	optionsNotionalVolume: false,
	dexAggregators: false,
	perpsAggregators: false,
	bridgeAggregators: false,
	stablecoins: false,
	bridge: false,
	treasury: false,
	unlocks: false,
	incentives: false,
	yields: false,
	fees: true,
	revenue: false,
	bribes: false,
	tokenTax: false,
	forks: false,
	governance: false,
	nfts: false,
	dev: false,
	inflows: false,
	liquidity: false,
	activeUsers: false,
	newUsers: false,
	txCount: false,
	gasUsed: false,
	borrowed: false,
	tokenRights: false
}

describe('KeyMetrics', () => {
	it('renders chain rows for fee breakdown metrics', async () => {
		const { KeyMetrics } = await import('./KeyMetrics')

		const markup = renderToStaticMarkup(
			<KeyMetrics
				name="Gauntlet"
				metrics={metrics}
				hasKeyMetrics={true}
				category="Analytics"
				openSmolStatsSummaryByDefault={true}
				formatPrice={(value) => `$${value}`}
				fees={{
					total24h: 12,
					total7d: 70,
					total30d: 300,
					totalAllTime: 1500,
					chainBreakdown: {
						Ethereum: {
							total24h: 4,
							total7d: 28,
							total30d: 120,
							totalAllTime: 700
						},
						Base: {
							total24h: 8,
							total7d: 42,
							total30d: 180,
							totalAllTime: 800
						}
					}
				}}
			/>
		)

		expect(markup).toContain('Fees 30d')
		expect(markup).toContain('Ethereum')
		expect(markup).toContain('Base')
		expect(markup).toContain('$120')
		expect(markup).toContain('$180')
	})
})
