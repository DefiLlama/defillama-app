import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getTokenRiskData } from '~/containers/Token/queries'
import type { ITokenRightsData } from '~/containers/TokenRights/api.types'
import TokenPage, { getStaticPaths, getStaticProps } from '~/pages/token/[token]'
import type { IProtocolMetadata } from '~/utils/metadata/types'
import type { TokenDirectory } from '~/utils/tokenDirectory'
import type { TokenRiskResponse } from './tokenRisk.types'

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

const state: {
	tokensJson: TokenDirectory
	tokenRightsEntries: unknown[]
	protocolMetadata: Record<string, IProtocolMetadata>
	incomeStatementData: unknown
	tokenRiskData: TokenRiskResponse | null
	initialYieldsRows: unknown[]
	initialTokenStrategiesData: unknown
	tokenlist: Record<string, unknown>
} = {
	tokensJson: {
		btc: { name: 'Bitcoin', symbol: 'BTC', token_nk: 'coingecko:bitcoin' },
		eth: { name: 'Ethereum', symbol: 'ETH', token_nk: 'coingecko:ethereum' }
	},
	tokenRightsEntries: [],
	protocolMetadata: {},
	incomeStatementData: null,
	tokenRiskData: null,
	initialYieldsRows: [],
	initialTokenStrategiesData: null,
	tokenlist: {
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
}

function resetState() {
	state.tokensJson = {
		btc: { name: 'Bitcoin', symbol: 'BTC', token_nk: 'coingecko:bitcoin' },
		eth: { name: 'Ethereum', symbol: 'ETH', token_nk: 'coingecko:ethereum' }
	}
	state.tokenRightsEntries = []
	state.protocolMetadata = {}
	state.incomeStatementData = null
	state.tokenRiskData = null
	state.initialYieldsRows = []
	state.initialTokenStrategiesData = null
	state.tokenlist = {
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
}

vi.mock('~/constants', () => ({
	SKIP_BUILD_STATIC_GENERATION: false
}))

vi.mock('~/components/TokenOverviewHeader', () => ({
	TokenOverviewHeader: () => <div>token-overview-header</div>
}))

vi.mock('~/containers/Token/TokenUsageSection', () => ({
	TokenUsageSection: () => <div>token-usage-section</div>
}))

vi.mock('~/containers/Token/TokenYieldsSection', () => ({
	TokenYieldsSection: () => <div>token-yields-section</div>
}))

vi.mock('~/containers/Token/TokenBorrowSection', () => ({
	TokenBorrowSection: () => <div>token-borrow-section</div>
}))

vi.mock('~/containers/Token/TokenRisksSection', () => ({
	TokenRisksSection: () => <div>token-risks-section</div>
}))

vi.mock('~/containers/Token/TokenLongShortSection', () => ({
	TokenLongShortSection: () => <div>token-long-short-section</div>
}))

vi.mock('~/containers/Token/TokenIncomeStatementSection', () => ({
	TokenIncomeStatementSection: () => <div>token-income-statement-section</div>
}))

vi.mock('~/containers/TokenRights/TokenRightsByProtocol', () => ({
	TokenRightsByProtocol: () => <div>token-rights-section</div>
}))

vi.mock('~/layout', () => ({
	default: ({ children }: { children: ReactNode }) => <div>{children}</div>
}))

vi.mock('~/utils/maxAgeForNext', () => ({
	maxAgeForNext: () => 123
}))

vi.mock('~/utils/perf', () => ({
	withPerformanceLogging: (_label: string, fn: any) => fn
}))

vi.mock('~/containers/TokenRights/api', () => ({
	fetchTokenRightsData: vi.fn(() => Promise.resolve(state.tokenRightsEntries))
}))

vi.mock('~/utils/metadata', () => ({
	__esModule: true,
	default: {
		get tokenlist() {
			return state.tokenlist
		},
		get protocolMetadata() {
			return state.protocolMetadata
		},
		get protocolLlamaswapDataset() {
			return {}
		},
		get chainMetadata() {
			return {}
		}
	},
	refreshMetadataIfStale: vi.fn().mockResolvedValue(undefined)
}))

vi.mock('~/containers/ProtocolOverview/queries', () => ({
	getProtocolIncomeStatement: vi.fn(() => Promise.resolve(state.incomeStatementData))
}))

vi.mock('~/containers/Token/queries', () => ({
	getTokenRiskData: vi.fn(() => Promise.resolve(state.tokenRiskData))
}))

vi.mock('~/containers/Token/tokenYields.server', () => ({
	getTokenYieldsRows: vi.fn(() => Promise.resolve(state.initialYieldsRows))
}))

vi.mock('~/containers/Token/tokenStrategies.server', () => ({
	getTokenStrategiesData: vi.fn(() => Promise.resolve(state.initialTokenStrategiesData))
}))

vi.mock('~/utils/tokenDirectory', () => ({
	readTokenDirectory: vi.fn(() => Promise.resolve(state.tokensJson))
}))

afterEach(() => {
	resetState()
	vi.clearAllMocks()
})

describe('token page', () => {
	it('renders income statement, risk, token rights, token usage, and yield tables in order', () => {
		const html = renderToStaticMarkup(
			<TokenPage
				record={{ name: 'Bitcoin', symbol: 'BTC', token_nk: 'coingecko:bitcoin', tokenRights: true, is_yields: true }}
				displayName="BTC"
				tokenRightsData={tokenRightsFixture}
				incomeStatementData={{ data: {} }}
				incomeStatementProtocolName="Bitcoin Protocol"
				incomeStatementHasIncentives={false}
				tokenRiskData={{} as TokenRiskResponse}
				initialYieldsRows={[{ pool: 'pool-1' }]}
				initialTokenStrategiesData={{
					borrowAsCollateral: [{ pool: 'borrow-1' }],
					borrowAsDebt: [],
					longShort: [{ pool: 'long-short-1' }]
				}}
				geckoId="bitcoin"
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
		expect(html).toContain('token-borrow-section')
		expect(html).toContain('token-risks-section')
		expect(html).toContain('token-long-short-section')
		expect(html).toContain('token-rights-section')
		expect(html.indexOf('token-income-statement-section')).toBeGreaterThan(html.indexOf('token-overview-header'))
		expect(html.indexOf('token-risks-section')).toBeGreaterThan(html.indexOf('token-income-statement-section'))
		expect(html.indexOf('token-rights-section')).toBeGreaterThan(html.indexOf('token-risks-section'))
		expect(html.indexOf('token-usage-section')).toBeGreaterThan(html.indexOf('token-rights-section'))
		expect(html.indexOf('token-yields-section')).toBeGreaterThan(html.indexOf('token-usage-section'))
		expect(html.indexOf('token-borrow-section')).toBeGreaterThan(html.indexOf('token-yields-section'))
		expect(html.indexOf('token-long-short-section')).toBeGreaterThan(html.indexOf('token-borrow-section'))
	})

	it('does not render the yields stack when the token does not opt into yields', () => {
		const html = renderToStaticMarkup(
			<TokenPage
				record={{ name: 'Bitcoin', symbol: 'BTC', token_nk: 'coingecko:bitcoin' }}
				displayName="BTC"
				tokenRightsData={null}
				incomeStatementData={null}
				incomeStatementProtocolName={null}
				incomeStatementHasIncentives={false}
				tokenRiskData={null}
				initialYieldsRows={[]}
				initialTokenStrategiesData={null}
				geckoId="bitcoin"
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
		expect(html).not.toContain('token-borrow-section')
		expect(html).not.toContain('token-risks-section')
		expect(html).not.toContain('token-long-short-section')
	})

	it('renders each yield-related section from its own prefetched dataset', () => {
		const html = renderToStaticMarkup(
			<TokenPage
				record={{ name: 'Bitcoin', symbol: 'BTC', token_nk: 'coingecko:bitcoin', is_yields: true }}
				displayName="BTC"
				tokenRightsData={null}
				incomeStatementData={null}
				incomeStatementProtocolName={null}
				incomeStatementHasIncentives={false}
				tokenRiskData={{} as TokenRiskResponse}
				initialYieldsRows={[]}
				initialTokenStrategiesData={{
					borrowAsCollateral: [{ pool: 'borrow-1' }],
					borrowAsDebt: [],
					longShort: [{ pool: 'long-short-1' }]
				}}
				geckoId="bitcoin"
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
		expect(html).toContain('token-borrow-section')
		expect(html).toContain('token-long-short-section')
		expect(html).toContain('token-risks-section')
	})

	it('getStaticPaths returns empty paths with blocking fallback', () => {
		expect(getStaticPaths()).toEqual({
			paths: [],
			fallback: 'blocking'
		})
	})

	it('getStaticProps returns notFound when params.token is missing', async () => {
		await expect(getStaticProps({ params: {} } as never)).resolves.toEqual({
			notFound: true
		})
	})

	it('getStaticProps returns notFound for an unknown token key', async () => {
		await expect(getStaticProps({ params: { token: 'litecoin' } } as never)).resolves.toEqual({
			notFound: true,
			revalidate: 123
		})
	})

	it('getStaticProps resolves the route param by slugging the token key', async () => {
		await expect(getStaticProps({ params: { token: 'BTC' } } as never)).resolves.toEqual({
			props: {
				record: { name: 'Bitcoin', symbol: 'BTC', token_nk: 'coingecko:bitcoin' },
				displayName: 'BTC',
				tokenRightsData: null,
				incomeStatementData: null,
				incomeStatementProtocolName: null,
				incomeStatementHasIncentives: false,
				geckoId: 'bitcoin',
				tokenRiskData: null,
				initialYieldsRows: [],
				initialTokenStrategiesData: null,
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
		await expect(getStaticProps({ params: { token: 'bitcoin' } } as never)).resolves.toEqual({
			notFound: true,
			revalidate: 123
		})
	})

	it('getStaticProps returns props even when token market stats are missing', async () => {
		state.tokensJson = {
			btc: { name: 'Bitcoin', symbol: 'BTC' }
		}
		state.tokenlist = {}

		await expect(getStaticProps({ params: { token: 'btc' } } as never)).resolves.toEqual({
			props: {
				record: { name: 'Bitcoin', symbol: 'BTC' },
				displayName: 'BTC',
				tokenRightsData: null,
				incomeStatementData: null,
				incomeStatementProtocolName: null,
				incomeStatementHasIncentives: false,
				geckoId: null,
				tokenRiskData: null,
				initialYieldsRows: [],
				initialTokenStrategiesData: null,
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
		state.tokenRightsEntries = [
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
		]
		state.tokensJson = {
			link: {
				name: 'Chainlink',
				symbol: 'LINK',
				token_nk: 'coingecko:chainlink',
				protocolId: 'parent#chainlink',
				tokenRights: true
			}
		}
		state.tokenlist = {
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
		await expect(getStaticProps({ params: { token: 'link' } } as never)).resolves.toEqual({
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
				geckoId: 'chainlink',
				tokenRiskData: null,
				initialYieldsRows: [],
				initialTokenStrategiesData: null,
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

		state.tokensJson = {
			aave: {
				name: 'Aave',
				symbol: 'AAVE',
				token_nk: 'coingecko:aave',
				protocolId: 'parent#aave'
			}
		}
		state.protocolMetadata = {
			'parent#aave': {
				displayName: 'Aave',
				fees: true,
				revenue: true,
				incentives: true
			} as IProtocolMetadata
		}
		state.incomeStatementData = incomeStatementData
		state.tokenlist = {
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

		await expect(getStaticProps({ params: { token: 'aave' } } as never)).resolves.toEqual({
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
				geckoId: 'aave',
				tokenRiskData: null,
				initialYieldsRows: [],
				initialTokenStrategiesData: null,
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

	it('getStaticProps falls back to null token risk data when the risk query throws', async () => {
		state.tokensJson = {
			link: {
				name: 'Chainlink',
				symbol: 'LINK',
				token_nk: 'coingecko:chainlink',
				is_yields: true
			}
		}
		state.tokenlist = {
			chainlink: {
				symbol: 'link',
				current_price: 10,
				price_change_percentage_24h: 10,
				market_cap: 100,
				fully_diluted_valuation: 150,
				total_volume: 50,
				circulating_supply: 20,
				max_supply: 1000
			}
		}
		state.initialYieldsRows = [{ pool: 'pool-1' }]
		state.initialTokenStrategiesData = {
			borrowAsCollateral: [],
			borrowAsDebt: [],
			longShort: []
		}

		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
		vi.mocked(getTokenRiskData).mockRejectedValueOnce(new Error('risk failed'))

		const result = await getStaticProps({ params: { token: 'link' } } as never)

		expect('props' in result).toBe(true)
		if (!('props' in result)) throw new Error('expected props')

		expect(result.props.tokenRiskData).toBeNull()
		expect(result.props.initialYieldsRows).toEqual(state.initialYieldsRows)
		expect(result.props.initialTokenStrategiesData).toEqual(state.initialTokenStrategiesData)
		expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to load token risk data for chainlink', expect.any(Error))

		consoleErrorSpy.mockRestore()
	})

	it('renders the risks section only when getStaticProps returns token risk data', async () => {
		state.tokensJson = {
			link: {
				name: 'Chainlink',
				symbol: 'LINK',
				token_nk: 'coingecko:chainlink',
				is_yields: true
			}
		}
		state.tokenlist = {
			chainlink: {
				symbol: 'link',
				current_price: 10,
				price_change_percentage_24h: 10,
				market_cap: 100,
				fully_diluted_valuation: 150,
				total_volume: 50,
				circulating_supply: 20,
				max_supply: 1000
			}
		}

		const withoutRisk = await getStaticProps({ params: { token: 'link' } } as never)
		if (!('props' in withoutRisk)) throw new Error('expected props')

		const withoutRiskHtml = renderToStaticMarkup(<TokenPage {...withoutRisk.props} />)
		expect(withoutRiskHtml).not.toContain('token-yields-section')
		expect(withoutRiskHtml).not.toContain('token-borrow-section')
		expect(withoutRiskHtml).not.toContain('token-long-short-section')
		expect(withoutRiskHtml).not.toContain('token-risks-section')

		state.tokenRiskData = {
			candidates: [{ key: 'ethereum:0x5149', chain: 'ethereum', address: '0x5149', displayName: 'Ethereum' }],
			scopeCandidates: [{ key: 'ethereum:0x5149', chain: 'ethereum', address: '0x5149', displayName: 'Ethereum' }],
			selectedCandidateKey: null,
			borrowCaps: {
				summary: {
					totalBorrowCapUsd: 10,
					totalBorrowedUsd: 6,
					remainingCapUsd: 4,
					capUtilization: 0.6,
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
						market: 'main',
						debtSymbol: 'LINK',
						borrowCapUsd: 10,
						debtTotalBorrowedUsd: 6,
						debtTotalSupplyUsd: 12,
						remainingCapUsd: 4,
						availableToBorrowUsd: 4,
						debtUtilization: 0.5,
						eligibleCollateralCount: 1,
						eligibleCollateralSymbols: ['ETH']
					}
				],
				methodologies: {
					borrowCapUsd: 'cap',
					debtTotalBorrowedUsd: 'borrowed',
					debtUtilization: 'utilization',
					availableToBorrowUsd: 'available'
				}
			},
			collateralRisk: {
				summary: {
					totalBorrowableUsd: 0,
					routeCount: 0,
					isolatedRouteCount: 0,
					minLiquidationBuffer: null,
					maxLiquidationBuffer: null
				},
				rows: [],
				methodologies: {
					availableToBorrowUsd: 'available',
					maxLtv: 'ltv',
					liquidationThreshold: 'threshold',
					liquidationPenalty: 'penalty',
					isolationMode: 'isolation',
					debtCeilingUsd: 'ceiling'
				}
			},
			selectedChainRisk: null,
			limitations: ['limit']
		}

		const withRisk = await getStaticProps({ params: { token: 'link' } } as never)
		if (!('props' in withRisk)) throw new Error('expected props')

		const withRiskHtml = renderToStaticMarkup(<TokenPage {...withRisk.props} />)
		expect(withRiskHtml).not.toContain('token-yields-section')
		expect(withRiskHtml).not.toContain('token-borrow-section')
		expect(withRiskHtml).not.toContain('token-long-short-section')
		expect(withRiskHtml).toContain('token-risks-section')
	})
})
