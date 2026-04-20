import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ITokenRightsData } from '~/containers/TokenRights/api.types'
import type { IProtocolMetadata } from '~/utils/metadata/types'
import type { TokenDirectory } from '~/utils/tokenDirectory'

afterEach(() => {
	vi.clearAllMocks()
	vi.resetModules()
})

const tokenRightsFixture: ITokenRightsData = {
	overview: {
		protocolName: 'Bitcoin',
		tokens: ['BTC'],
		tokenTypes: ['Governance'],
		description: 'desc',
		utility: null,
		lastUpdated: null
	},
	governance: {
		summary: 'gov summary',
		decisionTokens: ['BTC'],
		details: null,
		links: []
	},
	decisions: {
		treasury: { tokens: ['BTC'], details: null },
		revenue: { tokens: ['N/A'], details: null }
	},
	economic: {
		summary: null,
		feeSwitchStatus: 'OFF',
		feeSwitchDetails: null,
		links: []
	},
	valueAccrual: {
		primary: null,
		details: null,
		buybacks: { tokens: ['N/A'], details: null },
		dividends: { tokens: ['N/A'], details: null },
		burns: { status: 'N/A', details: null }
	},
	alignment: {
		fundraising: [],
		raiseDetails: null,
		associatedEntities: [],
		equityRevenueCapture: null,
		equityStatement: null,
		ipAndBrand: null,
		domain: null,
		links: []
	},
	resources: {
		addresses: [],
		reports: []
	}
}

function setupPageModule({
	tokensJson = {
		btc: { name: 'Bitcoin', symbol: 'BTC', token_nk: 'coingecko:bitcoin' },
		eth: { name: 'Ethereum', symbol: 'ETH', token_nk: 'coingecko:ethereum' }
	},
	tokenRightsEntries = [],
	protocolMetadata = {},
	incomeStatementData = null,
	tokenlist = {
		bitcoin: {
			symbol: 'btc',
			current_price: 100,
			price_change_24h: 5,
			price_change_percentage_24h: 5,
			ath: null,
			ath_date: null,
			atl: null,
			atl_date: null,
			market_cap: 1000,
			fully_diluted_valuation: 1500,
			total_volume: 500,
			total_supply: null,
			circulating_supply: 21,
			max_supply: 21
		}
	}
}: {
	tokensJson?: TokenDirectory
	tokenRightsEntries?: unknown[]
	protocolMetadata?: Record<string, IProtocolMetadata>
	incomeStatementData?: unknown
	tokenlist?: Record<string, unknown>
} = {}) {
	vi.doMock('fs', () => ({
		promises: {
			readFile: vi.fn().mockResolvedValue(JSON.stringify(tokensJson))
		}
	}))
	vi.doMock('~/constants', () => ({
		SKIP_BUILD_STATIC_GENERATION: false
	}))
	vi.doMock('~/components/TokenOverviewHeader', () => ({
		TokenOverviewHeader: () => <div>token-overview-header</div>
	}))
	vi.doMock('~/containers/Token/TokenUsageSection', () => ({
		TokenUsageSection: () => <div>token-usage-section</div>
	}))
	vi.doMock('~/containers/Token/TokenYieldsSection', () => ({
		TokenYieldsSection: () => <div>token-yields-section</div>
	}))
	vi.doMock('~/containers/Token/TokenIncomeStatementSection', () => ({
		TokenIncomeStatementSection: () => <div>token-income-statement-section</div>
	}))
	vi.doMock('~/containers/TokenRights/TokenRightsByProtocol', () => ({
		TokenRightsByProtocol: () => <div>token-rights-section</div>
	}))
	vi.doMock('~/layout', () => ({
		default: ({ children }: { children: ReactNode }) => <div>{children}</div>
	}))
	vi.doMock('~/utils/maxAgeForNext', () => ({
		maxAgeForNext: () => 123
	}))
	vi.doMock('~/utils/perf', () => ({
		withPerformanceLogging: (_label: string, fn: any) => fn
	}))
	vi.doMock('~/containers/TokenRights/api', () => ({
		fetchTokenRightsData: vi.fn().mockResolvedValue(tokenRightsEntries)
	}))
	vi.doMock('~/utils/metadata', () => ({
		__esModule: true,
		default: {
			tokenlist,
			protocolMetadata
		},
		refreshMetadataIfStale: vi.fn().mockResolvedValue(undefined)
	}))
	vi.doMock('~/containers/ProtocolOverview/queries', () => ({
		getProtocolIncomeStatement: vi.fn().mockResolvedValue(incomeStatementData)
	}))

	return import('~/pages/token/[token]')
}

describe('token page', () => {
	it('renders income statement above token usage, yields, and token rights when data exists', async () => {
		const page = await setupPageModule()

		const html = renderToStaticMarkup(
			<page.default
				record={{ name: 'Bitcoin', symbol: 'BTC', token_nk: 'coingecko:bitcoin', tokenRights: true, is_yields: true }}
				displayName="BTC"
				tokenRightsData={tokenRightsFixture}
				incomeStatementData={{ data: {} }}
				incomeStatementProtocolName="Bitcoin Protocol"
				incomeStatementHasIncentives={false}
				price={100}
				percentChange={5}
				mcap={1000}
				fdv={1500}
				volume24h={500}
				circSupply={21}
				maxSupply={21}
				seoTitle="title"
				seoDescription="description"
				canonicalUrl="/token/btc"
			/>
		)

		expect(html).toContain('token-overview-header')
		expect(html).toContain('token-income-statement-section')
		expect(html).toContain('token-usage-section')
		expect(html).toContain('token-yields-section')
		expect(html).toContain('token-rights-section')
		expect(html.indexOf('token-income-statement-section')).toBeGreaterThan(html.indexOf('token-overview-header'))
		expect(html.indexOf('token-usage-section')).toBeGreaterThan(html.indexOf('token-income-statement-section'))
		expect(html.indexOf('token-yields-section')).toBeGreaterThan(html.indexOf('token-usage-section'))
		expect(html.indexOf('token-rights-section')).toBeGreaterThan(html.indexOf('token-yields-section'))
	})

	it('does not render the yields section when the token does not opt into yields', async () => {
		const page = await setupPageModule()

		const html = renderToStaticMarkup(
			<page.default
				record={{ name: 'Bitcoin', symbol: 'BTC', token_nk: 'coingecko:bitcoin' }}
				displayName="BTC"
				tokenRightsData={null}
				incomeStatementData={null}
				incomeStatementProtocolName={null}
				incomeStatementHasIncentives={false}
				price={100}
				percentChange={5}
				mcap={1000}
				fdv={1500}
				volume24h={500}
				circSupply={21}
				maxSupply={21}
				seoTitle="title"
				seoDescription="description"
				canonicalUrl="/token/btc"
			/>
		)

		expect(html).not.toContain('token-yields-section')
	})

	it('getStaticPaths returns empty paths with blocking fallback', async () => {
		const page = await setupPageModule()

		expect(page.getStaticPaths()).toEqual({
			paths: [],
			fallback: 'blocking'
		})
	})

	it('getStaticProps returns notFound when params.token is missing', async () => {
		const page = await setupPageModule()

		await expect(page.getStaticProps({ params: {} } as never)).resolves.toEqual({
			notFound: true
		})
	})

	it('getStaticProps returns notFound for an unknown token key', async () => {
		const page = await setupPageModule()

		await expect(page.getStaticProps({ params: { token: 'litecoin' } } as never)).resolves.toEqual({
			notFound: true,
			revalidate: 123
		})
	})

	it('getStaticProps resolves the route param by slugging the token key', async () => {
		const page = await setupPageModule()

		await expect(page.getStaticProps({ params: { token: 'BTC' } } as never)).resolves.toEqual({
			props: {
				record: { name: 'Bitcoin', symbol: 'BTC', token_nk: 'coingecko:bitcoin' },
				displayName: 'BTC',
				tokenRightsData: null,
				incomeStatementData: null,
				incomeStatementProtocolName: null,
				incomeStatementHasIncentives: false,
				price: 100,
				percentChange: 5,
				mcap: 1000,
				fdv: 1500,
				volume24h: 500,
				circSupply: 21,
				maxSupply: 21,
				seoTitle: 'BTC Price, Market Cap & Supply - DefiLlama',
				seoDescription:
					'Track BTC price, market cap, circulating supply, max supply, and 24h trading volume on DefiLlama.',
				canonicalUrl: '/token/BTC'
			},
			revalidate: 123
		})
	})

	it('getStaticProps does not resolve by token name slug', async () => {
		const page = await setupPageModule()

		await expect(page.getStaticProps({ params: { token: 'bitcoin' } } as never)).resolves.toEqual({
			notFound: true,
			revalidate: 123
		})
	})

	it('getStaticProps returns props even when token market stats are missing', async () => {
		const page = await setupPageModule({
			tokensJson: {
				btc: { name: 'Bitcoin', symbol: 'BTC' }
			},
			tokenlist: {}
		})

		await expect(page.getStaticProps({ params: { token: 'btc' } } as never)).resolves.toEqual({
			props: {
				record: { name: 'Bitcoin', symbol: 'BTC' },
				displayName: 'BTC',
				tokenRightsData: null,
				incomeStatementData: null,
				incomeStatementProtocolName: null,
				incomeStatementHasIncentives: false,
				price: null,
				percentChange: null,
				mcap: null,
				fdv: null,
				volume24h: null,
				circSupply: null,
				maxSupply: null,
				seoTitle: 'BTC Price, Market Cap & Supply - DefiLlama',
				seoDescription:
					'Track BTC price, market cap, circulating supply, max supply, and 24h trading volume on DefiLlama.',
				canonicalUrl: '/token/btc'
			},
			revalidate: 123
		})
	})

	it('getStaticProps includes token rights data when the token record has the flag', async () => {
		const page = await setupPageModule({
			tokenRightsEntries: [
				{
					'Protocol Name': 'Chainlink',
					Token: ['LINK'],
					'Token Type': ['Governance'],
					'Brief description': 'desc',
					'Governance Details (Summary)': 'gov summary',
					'Governance Decisions': ['LINK'],
					'Treasury Decisions': ['LINK'],
					'Revenue Decisions': ['N/A'],
					'Fee Switch Status': 'OFF',
					Buybacks: ['N/A'],
					Dividends: ['N/A'],
					Burns: 'N/A',
					'Associated Entities': [],
					'DefiLlama ID': 'parent#chainlink'
				}
			],
			tokensJson: {
				link: {
					name: 'Chainlink',
					symbol: 'LINK',
					token_nk: 'coingecko:chainlink',
					protocolId: 'parent#chainlink',
					tokenRights: true
				}
			},
			tokenlist: {
				chainlink: {
					symbol: 'link',
					current_price: 10,
					price_change_24h: 1,
					price_change_percentage_24h: 10,
					ath: null,
					ath_date: null,
					atl: null,
					atl_date: null,
					market_cap: 100,
					fully_diluted_valuation: 150,
					total_volume: 50,
					total_supply: null,
					circulating_supply: 20,
					max_supply: 1000
				}
			}
		})

		await expect(page.getStaticProps({ params: { token: 'link' } } as never)).resolves.toEqual({
			props: {
				record: {
					name: 'Chainlink',
					symbol: 'LINK',
					token_nk: 'coingecko:chainlink',
					protocolId: 'parent#chainlink',
					tokenRights: true
				},
				displayName: 'LINK',
				tokenRightsData: {
					overview: {
						protocolName: 'Chainlink',
						tokens: ['LINK'],
						tokenTypes: ['Governance'],
						description: 'desc',
						utility: null,
						lastUpdated: null
					},
					governance: {
						summary: 'gov summary',
						decisionTokens: ['LINK'],
						details: null,
						links: []
					},
					decisions: {
						treasury: { tokens: ['LINK'], details: null },
						revenue: { tokens: ['N/A'], details: null }
					},
					economic: {
						summary: null,
						feeSwitchStatus: 'OFF',
						feeSwitchDetails: null,
						links: []
					},
					valueAccrual: {
						primary: null,
						details: null,
						buybacks: { tokens: ['N/A'], details: null },
						dividends: { tokens: ['N/A'], details: null },
						burns: { status: 'N/A', details: null }
					},
					alignment: {
						fundraising: [],
						raiseDetails: null,
						associatedEntities: [],
						equityRevenueCapture: null,
						equityStatement: null,
						ipAndBrand: null,
						domain: null,
						links: []
					},
					resources: {
						addresses: [],
						reports: []
					}
				},
				incomeStatementData: null,
				incomeStatementProtocolName: null,
				incomeStatementHasIncentives: false,
				price: 10,
				percentChange: 10,
				mcap: 100,
				fdv: 150,
				volume24h: 50,
				circSupply: 20,
				maxSupply: 1000,
				seoTitle: 'LINK Price, Market Cap, Supply & Token Rights - DefiLlama',
				seoDescription:
					'Track LINK price, market cap, circulating supply, max supply, 24h trading volume, and token rights on DefiLlama.',
				canonicalUrl: '/token/link'
			},
			revalidate: 123
		})
	})

	it('getStaticProps includes income statement data when the token protocol has one', async () => {
		const incomeStatementData = {
			data: {
				monthly: {},
				quarterly: {
					'2026-Q1': {
						'Gross Protocol Revenue': { value: 10, 'by-label': {} },
						'Cost Of Revenue': { value: -2, 'by-label': {} },
						'Gross Profit': { value: 8, 'by-label': {} },
						Earnings: { value: 8, 'by-label': {} }
					}
				},
				yearly: {},
				cumulative: {}
			},
			labelsByType: {},
			methodology: {},
			breakdownMethodology: {},
			hasOtherTokenHolderFlows: false,
			hasTokenHolderNetIncome: false
		}
		const page = await setupPageModule({
			tokensJson: {
				aave: {
					name: 'Aave',
					symbol: 'AAVE',
					token_nk: 'coingecko:aave',
					protocolId: 'parent#aave'
				}
			},
			protocolMetadata: {
				'parent#aave': {
					displayName: 'Aave',
					fees: true,
					revenue: true,
					incentives: true
				} as IProtocolMetadata
			},
			incomeStatementData,
			tokenlist: {
				aave: {
					symbol: 'aave',
					current_price: 10,
					price_change_percentage_24h: 10,
					market_cap: 100,
					fully_diluted_valuation: 150,
					total_volume: 50,
					circulating_supply: 20,
					max_supply: 1000
				}
			}
		})

		await expect(page.getStaticProps({ params: { token: 'aave' } } as never)).resolves.toEqual({
			props: {
				record: {
					name: 'Aave',
					symbol: 'AAVE',
					token_nk: 'coingecko:aave',
					protocolId: 'parent#aave'
				},
				displayName: 'AAVE',
				tokenRightsData: null,
				incomeStatementData,
				incomeStatementProtocolName: 'Aave',
				incomeStatementHasIncentives: true,
				price: 10,
				percentChange: 10,
				mcap: 100,
				fdv: 150,
				volume24h: 50,
				circSupply: 20,
				maxSupply: 1000,
				seoTitle: 'AAVE Price, Market Cap & Supply - DefiLlama',
				seoDescription:
					'Track AAVE price, market cap, circulating supply, max supply, and 24h trading volume on DefiLlama.',
				canonicalUrl: '/token/aave'
			},
			revalidate: 123
		})
	})
})
