import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { IProtocolPageMetrics } from './types'

const canonicalProtocolAaveRegex =
	/<link\b(?=[^>]*\brel="canonical")(?=[^>]*\bhref="https:\/\/defillama\.com\/protocol\/aave")[^>]*\/?>/
const canonicalProtocolActiveLoansAaveRegex =
	/<link\b(?=[^>]*\brel="canonical")(?=[^>]*\bhref="https:\/\/defillama\.com\/protocol\/active-loans\/aave")[^>]*\/?>/
const canonicalProtocolDefiSwapRegex =
	/<link\b(?=[^>]*\brel="canonical")(?=[^>]*\bhref="https:\/\/defillama\.com\/protocol\/defi-swap")[^>]*\/?>/
const canonicalCexMarketsCryptoComRegex =
	/<link\b(?=[^>]*\brel="canonical")(?=[^>]*\bhref="https:\/\/defillama\.com\/cex\/markets\/crypto-com")[^>]*\/?>/
const robotsNoindexRegex = /<meta\b(?=[^>]*\bname="robots")(?=[^>]*\bcontent="noindex")[^>]*\/?>/

const metrics: IProtocolPageMetrics = {
	tvl: true,
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
	fees: false,
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

afterEach(() => {
	vi.clearAllMocks()
	vi.resetModules()
})

describe('ProtocolOverview final page SEO', () => {
	it('renders the final protocol page without a noindex tag and with a canonical URL', async () => {
		vi.doMock('next/head', () => ({
			default: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children)
		}))
		vi.doMock('next/router', () => ({
			useRouter: () => ({ query: {} })
		}))
		vi.doMock('~/api/client', () => ({
			useGetTokenPrice: () => ({ data: null, isLoading: false })
		}))
		vi.doMock('./helpers', () => ({
			useFinalTVL: () => ({
				tvl: 0,
				tvlByChain: [],
				oracleTvs: 0,
				oracleTvsByChain: [],
				toggleOptions: undefined
			}),
			getPrimaryValueLabelType: () => ({
				title: 'Total Value Locked',
				byChainTitle: 'TVL by chain'
			})
		}))
		vi.doMock('~/hooks/useIsClient', () => ({
			useIsClient: () => false
		}))
		vi.doMock('~/components/Nav', () => ({
			Nav: () => null
		}))
		vi.doMock('~/components/Metrics', () => ({
			MetricsAndTools: () => null
		}))
		vi.doMock('~/components/Search', () => ({
			DesktopSearch: () => null
		}))
		vi.doMock('@ariakit/react', () => ({
			MenuProvider: ({ children }: { children: React.ReactNode }) =>
				React.createElement(React.Fragment, null, children),
			MenuButton: ({ children }: { children: React.ReactNode }) => React.createElement('button', null, children),
			MenuButtonArrow: () => null,
			Menu: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
			PopoverDismiss: ({ children }: { children: React.ReactNode }) => React.createElement('button', null, children),
			MenuItem: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children)
		}))
		vi.doMock('~/components/Bookmark', () => ({
			Bookmark: () => null
		}))
		vi.doMock('~/components/EntityQuestionsStrip', () => ({
			EntityQuestionsStrip: () => null
		}))
		vi.doMock('~/components/Icon', () => ({
			Icon: () => null
		}))
		vi.doMock('~/components/Link', () => ({
			BasicLink: ({ children, href }: { children: React.ReactNode; href: string }) =>
				React.createElement('a', { href }, children),
			ButtonLink: ({ children, href }: { children: React.ReactNode; href: string }) =>
				React.createElement('a', { href }, children)
		}))
		vi.doMock('~/components/SEO', async () => {
			const actual = await vi.importActual<typeof import('~/components/SEO')>('~/components/SEO')

			return {
				...actual,
				LinkPreviewCard: () => null
			}
		})
		vi.doMock('~/components/TokenLogo', () => ({
			TokenLogo: () => null
		}))
		vi.doMock('~/components/Tooltip', () => ({
			Tooltip: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children)
		}))
		vi.doMock('./AdditionalInfo', () => ({
			AdditionalInfo: () => null
		}))
		vi.doMock('./KeyMetrics', () => ({
			KeyMetrics: () => null
		}))
		vi.doMock('./ProtocolChartPanel', () => ({
			ProtocolChartPanel: () => null
		}))

		const { ProtocolOverview } = await import('./index')
		const props = {
			name: 'Aave',
			category: 'Lending',
			metrics,
			chartDenominations: [],
			token: {
				symbol: 'AAVE'
			},
			isCEX: false,
			deprecated: false,
			hasKeyMetrics: false,
			incomeStatement: null,
			seoTitle: 'Aave',
			seoDescription: 'Aave protocol overview'
		} as Parameters<typeof ProtocolOverview>[0]

		const markup = renderToStaticMarkup(React.createElement(ProtocolOverview, props))

		expect(markup).toMatch(canonicalProtocolAaveRegex)
		expect(markup).not.toMatch(robotsNoindexRegex)
	})
})

function setupLayoutMocks() {
	vi.doMock('next/head', () => ({
		default: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children)
	}))
	vi.doMock('@ariakit/react', () => ({
		MenuProvider: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
		MenuButton: ({ children }: { children: React.ReactNode }) => React.createElement('button', null, children),
		MenuButtonArrow: () => null,
		Menu: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
		PopoverDismiss: ({ children }: { children: React.ReactNode }) => React.createElement('button', null, children),
		MenuItem: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children)
	}))
	vi.doMock('~/components/EntityQuestionsStrip', () => ({
		EntityQuestionsStrip: () => null
	}))
	vi.doMock('~/components/Icon', () => ({
		Icon: () => null
	}))
	vi.doMock('~/components/Link', () => ({
		BasicLink: ({ children, href }: { children: React.ReactNode; href: string }) =>
			React.createElement('a', { href }, children),
		ButtonLink: ({ children, href }: { children: React.ReactNode; href: string }) =>
			React.createElement('a', { href }, children)
	}))
	vi.doMock('~/components/TokenLogo', () => ({
		TokenLogo: () => null
	}))
	vi.doMock('~/layout', async () => {
		const { SEO } = await vi.importActual<typeof import('~/components/SEO')>('~/components/SEO')

		return {
			default: ({
				title,
				description,
				canonicalUrl,
				noIndex,
				children
			}: {
				title: string
				description: string | null | undefined
				canonicalUrl: string | null | undefined
				noIndex?: boolean
				children?: React.ReactNode
			}) =>
				React.createElement(
					React.Fragment,
					null,
					React.createElement(SEO, { title, description, canonicalUrl, noIndex }),
					children
				)
		}
	})
}

describe('ProtocolOverviewLayout SEO', () => {
	it('keeps the information tab indexable with a canonical URL', async () => {
		setupLayoutMocks()

		const { ProtocolOverviewLayout } = await import('./Layout')
		const markup = renderToStaticMarkup(
			React.createElement(
				ProtocolOverviewLayout as React.ComponentType<any>,
				{
					name: 'Aave',
					category: 'Lending',
					metrics,
					tab: 'information'
				},
				null
			)
		)

		expect(markup).toMatch(canonicalProtocolAaveRegex)
		expect(markup).not.toMatch(robotsNoindexRegex)
	})

	it('marks configured protocol overview pages as noindex while keeping the canonical URL', async () => {
		setupLayoutMocks()

		const { ProtocolOverviewLayout } = await import('./Layout')
		const markup = renderToStaticMarkup(
			React.createElement(
				ProtocolOverviewLayout as React.ComponentType<any>,
				{
					name: 'Defi Swap',
					category: 'DEX',
					metrics,
					tab: 'information'
				},
				null
			)
		)

		expect(markup).toMatch(canonicalProtocolDefiSwapRegex)
		expect(markup).toMatch(robotsNoindexRegex)
	})

	it('marks a non-standalone tab as noindex without a canonical URL', async () => {
		setupLayoutMocks()

		const { ProtocolOverviewLayout } = await import('./Layout')
		const markup = renderToStaticMarkup(
			React.createElement(
				ProtocolOverviewLayout as React.ComponentType<any>,
				{
					name: 'Aave',
					category: 'Lending',
					metrics,
					tab: 'tvl'
				},
				null
			)
		)

		expect(markup).toMatch(robotsNoindexRegex)
		expect(markup).not.toMatch(canonicalProtocolAaveRegex)
	})

	it('keeps the active loans tab indexable with the new canonical URL', async () => {
		setupLayoutMocks()

		const { ProtocolOverviewLayout } = await import('./Layout')
		const markup = renderToStaticMarkup(
			React.createElement(
				ProtocolOverviewLayout as React.ComponentType<any>,
				{
					name: 'Aave',
					category: 'Lending',
					metrics: { ...metrics, borrowed: true },
					tab: 'borrowed'
				},
				null
			)
		)

		expect(markup).toMatch(canonicalProtocolActiveLoansAaveRegex)
		expect(markup).not.toMatch(robotsNoindexRegex)
	})

	it('shows the CEX markets tab only when a markets exchange exists', async () => {
		setupLayoutMocks()

		const { ProtocolOverviewLayout } = await import('./Layout')
		const withMarkets = renderToStaticMarkup(
			React.createElement(
				ProtocolOverviewLayout as React.ComponentType<any>,
				{
					isCEX: true,
					name: 'Crypto.com',
					category: 'CEX',
					metrics,
					tab: 'markets',
					cexMarketsExchange: 'cryptocom',
					cexMarketsSlug: 'Crypto-com'
				},
				null
			)
		)

		vi.resetModules()
		setupLayoutMocks()
		const { ProtocolOverviewLayout: ProtocolOverviewLayoutWithoutMarkets } = await import('./Layout')
		const withoutMarkets = renderToStaticMarkup(
			React.createElement(
				ProtocolOverviewLayoutWithoutMarkets as React.ComponentType<any>,
				{
					isCEX: true,
					name: 'Crypto.com',
					category: 'CEX',
					metrics,
					tab: 'information',
					cexMarketsExchange: null
				},
				null
			)
		)

		expect(withMarkets).toMatch(canonicalCexMarketsCryptoComRegex)
		expect(withMarkets).toContain('href="/cex/markets/crypto-com"')
		expect(withMarkets).toContain('>Markets</a>')
		expect(withMarkets).not.toMatch(robotsNoindexRegex)
		expect(withoutMarkets).not.toContain('href="/cex/markets/crypto-com"')
	})
})

describe('ProtocolOverview SEO contract', () => {
	it('passes the information tab to ProtocolOverviewLayout', async () => {
		let capturedTab: string | undefined

		vi.doMock('next/router', () => ({
			useRouter: () => ({ query: {} })
		}))
		vi.doMock('~/api/client', () => ({
			useGetTokenPrice: () => ({ data: null, isLoading: false })
		}))
		vi.doMock('./helpers', () => ({
			useFinalTVL: () => ({
				tvl: 0,
				tvlByChain: [],
				oracleTvs: 0,
				oracleTvsByChain: [],
				toggleOptions: undefined
			}),
			getPrimaryValueLabelType: () => ({
				title: 'Total Value Locked',
				byChainTitle: 'TVL by chain'
			})
		}))
		vi.doMock('~/components/Bookmark', () => ({
			Bookmark: () => null
		}))
		vi.doMock('~/components/Icon', () => ({
			Icon: () => null
		}))
		vi.doMock('~/components/SEO', () => ({
			LinkPreviewCard: () => null
		}))
		vi.doMock('~/components/TokenLogo', () => ({
			TokenLogo: () => null
		}))
		vi.doMock('~/components/Tooltip', () => ({
			Tooltip: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children)
		}))
		vi.doMock('./AdditionalInfo', () => ({
			AdditionalInfo: () => null
		}))
		vi.doMock('./KeyMetrics', () => ({
			KeyMetrics: () => null
		}))
		vi.doMock('./ProtocolChartPanel', () => ({
			ProtocolChartPanel: () => null
		}))
		vi.doMock('./Layout', () => ({
			ProtocolOverviewLayout: ({ tab }: { tab?: string }) => {
				capturedTab = tab
				return null
			}
		}))

		const { ProtocolOverview } = await import('./index')
		const props = {
			name: 'Aave',
			category: 'Lending',
			metrics,
			chartDenominations: [],
			token: {
				symbol: 'AAVE'
			},
			isCEX: false,
			deprecated: false,
			hasKeyMetrics: false,
			incomeStatement: null,
			seoTitle: 'Aave',
			seoDescription: 'Aave protocol overview'
		} as Parameters<typeof ProtocolOverview>[0]

		renderToStaticMarkup(React.createElement(ProtocolOverview, props))

		expect(capturedTab).toBe('information')
	})
})

describe('ProtocolInfo category links', () => {
	it('renders a category CTA linking back to the category page', async () => {
		vi.doMock('~/components/Icon', () => ({
			Icon: () => null
		}))
		vi.doMock('~/components/Link', () => ({
			BasicLink: ({
				children,
				href,
				...props
			}: {
				children: React.ReactNode
				href: string
			} & Record<string, unknown>) => React.createElement('a', { href, ...props }, children),
			ButtonLink: ({ children }: { children: React.ReactNode }) => React.createElement('button', null, children)
		}))
		vi.doMock('~/components/Menu', () => ({
			Menu: () => null
		}))
		vi.doMock('~/components/MetricPrimitives', () => ({
			MetricRow: () => null
		}))
		vi.doMock('~/components/QuestionHelper', () => ({
			QuestionHelper: () => null
		}))
		vi.doMock('~/components/Tooltip', () => ({
			Tooltip: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children)
		}))
		vi.doMock('~/containers/Subscription/auth', () => ({
			useAuthContext: () => ({ activePlan: null })
		}))
		vi.doMock('~/containers/Subscription/signupSource', () => ({
			setSignupSource: () => undefined
		}))

		const { ProtocolInfo } = await vi.importActual<typeof import('./AdditionalInfo')>('./AdditionalInfo')
		const markup = renderToStaticMarkup(
			React.createElement(ProtocolInfo, {
				name: 'Polymarket',
				description: 'Prediction markets protocol.',
				category: 'Prediction Market',
				tags: null,
				audits: null,
				website: null,
				github: null,
				twitter: null,
				safeHarbor: false,
				isCEX: false
			} as Parameters<typeof ProtocolInfo>[0])
		)

		expect(markup).toContain('href="/protocols/prediction-market"')
		expect(markup).toContain('>Prediction Market<')
		expect(markup).toContain('>Category<')
	})
})
