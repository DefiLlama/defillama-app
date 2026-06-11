import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { IKeyMetricsProps } from '../KeyMetrics'
import type { IProtocolPageMetrics } from '../types'

const mocks = vi.hoisted(() => ({
	tvlFeesSettings: { bribes: false, tokentax: false }
}))

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
	useLocalStorageSettingsManager: () => [mocks.tvlFeesSettings]
}))

vi.mock('~/components/Icon', () => ({
	Icon: () => null
}))

vi.mock('~/components/Tooltip', () => ({
	Tooltip: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children)
}))

vi.mock('../Flag', () => ({
	Flag: () => null
}))

vi.mock('../KeyMetricsPngExport', () => ({
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

const renderKeyMetrics = async (props: IKeyMetricsProps) => {
	const { KeyMetrics } = await import('../KeyMetrics')

	return renderToStaticMarkup(<KeyMetrics {...props} />)
}

const baseProps = {
	name: 'Gauntlet',
	metrics,
	hasKeyMetrics: true,
	category: 'Analytics',
	openSmolStatsSummaryByDefault: true,
	formatPrice: (value: number | string | null) => (value == null ? null : `$${Math.round(Number(value))}`)
}

describe('KeyMetrics', () => {
	beforeEach(() => {
		mocks.tvlFeesSettings.bribes = false
		mocks.tvlFeesSettings.tokentax = false
	})

	it('renders chain rows for fee breakdown metrics', async () => {
		const markup = await renderKeyMetrics({
			...baseProps,
			fees: {
				total24h: 12,
				total7d: 70,
				total30d: 300,
				total1y: 3500,
				annualized1y: 3500,
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
			}
		})

		expect(markup).toContain('Fees 30d')
		expect(markup).toContain('Ethereum')
		expect(markup).toContain('Base')
		expect(markup).toContain('$120')
		expect(markup).toContain('$180')
		expect(markup.indexOf('Base')).toBeLessThan(markup.indexOf('Ethereum'))
	})

	it('uses the annualized1y fees value for annualized metrics when available', async () => {
		const markup = await renderKeyMetrics({
			...baseProps,
			fees: {
				total24h: null,
				total7d: null,
				total30d: 100,
				total1y: 3500,
				annualized1y: 3500,
				totalAllTime: null,
				chainBreakdown: null
			}
		})

		expect(markup).toContain('Fees (Annualized)')
		expect(markup).toContain('$3500')
		expect(markup).not.toContain('$1220')
	})

	it('falls back to 30d annualized fees when annualized1y fees are missing', async () => {
		const markup = await renderKeyMetrics({
			...baseProps,
			fees: {
				total24h: null,
				total7d: null,
				total30d: 100,
				total1y: null,
				annualized1y: null,
				totalAllTime: null,
				chainBreakdown: null
			}
		})

		expect(markup).toContain('Fees (Annualized)')
		expect(markup).toContain('$1220')
	})

	it('does not render zero fee rows for disabled extra-only periods', async () => {
		const markup = await renderKeyMetrics({
			...baseProps,
			fees: {
				total24h: null,
				total7d: 70,
				total30d: null,
				total1y: null,
				annualized1y: null,
				totalAllTime: null,
				chainBreakdown: null
			},
			bribeRevenue: {
				total24h: 10,
				total7d: null,
				total30d: 300,
				total1y: null,
				annualized1y: null,
				totalAllTime: 1000
			},
			tokenTax: {
				total24h: 5,
				total7d: null,
				total30d: 30,
				total1y: null,
				annualized1y: null,
				totalAllTime: null
			}
		})

		expect(markup).toContain('Fees 7d')
		expect(markup).toContain('$70')
		expect(markup).not.toContain('Fees 24h')
		expect(markup).not.toContain('Fees 30d')
		expect(markup).not.toContain('Cumulative Fees')
		expect(markup).not.toContain('$0')
	})

	it('uses annualized1y revenue and trailing 12-month incentives for annualized earnings when both are available', async () => {
		const markup = await renderKeyMetrics({
			...baseProps,
			revenue: {
				total24h: null,
				total7d: null,
				total30d: 400,
				total1y: 5000,
				annualized1y: 5000,
				totalAllTime: null,
				chainBreakdown: null
			},
			incentives: {
				emissions24h: 0,
				emissions7d: 0,
				emissions30d: 100,
				emissions1y: 1400,
				emissionsAllTime: 0,
				emissionsMonthlyAverage1y: 0
			}
		})

		expect(markup).toContain('Earnings (Annualized)')
		expect(markup).toContain('$3600')
		expect(markup).not.toContain('$3660')
	})

	it('uses enabled extra-only adjusted revenue periods for earnings', async () => {
		mocks.tvlFeesSettings.bribes = true

		const markup = await renderKeyMetrics({
			...baseProps,
			revenue: {
				total24h: null,
				total7d: null,
				total30d: null,
				total1y: null,
				annualized1y: null,
				totalAllTime: null,
				chainBreakdown: null
			},
			bribeRevenue: {
				total24h: 50,
				total7d: 200,
				total30d: 600,
				total1y: null,
				annualized1y: null,
				totalAllTime: 1000
			},
			incentives: {
				emissions24h: 10,
				emissions7d: 20,
				emissions30d: 100,
				emissions1y: null,
				emissionsAllTime: 200,
				emissionsMonthlyAverage1y: 0
			}
		})

		expect(markup).toContain('Earnings 30d')
		expect(markup).toContain('$500')
		expect(markup).toContain('Earnings 7d')
		expect(markup).toContain('$180')
		expect(markup).toContain('Earnings 24h')
		expect(markup).toContain('$40')
		expect(markup).toContain('Cumulative Earnings')
		expect(markup).toContain('$800')
	})
})
