import { afterEach, describe, expect, it, vi } from 'vitest'
import type { TokenDirectory } from '~/utils/tokenDirectory'

afterEach(() => {
	vi.clearAllMocks()
	vi.resetModules()
})

function setupPageModule({
	tokensJson = {
		btc: { name: 'Bitcoin', symbol: 'BTC', token_nk: 'coingecko:bitcoin' },
		eth: { name: 'Ethereum', symbol: 'ETH', token_nk: 'coingecko:ethereum' }
	},
	tokenRightsEntries = [],
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
		TokenOverviewHeader: () => null
	}))
	vi.doMock('~/containers/TokenRights/TokenRightsByProtocol', () => ({
		TokenRightsByProtocol: () => null
	}))
	vi.doMock('~/layout', () => ({
		default: () => null
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
			tokenlist
		},
		refreshMetadataIfStale: vi.fn().mockResolvedValue(undefined)
	}))

	return import('~/pages/token/[token]')
}

describe('token page', () => {
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
})
