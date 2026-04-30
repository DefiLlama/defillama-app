import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getProtocolIncomeStatement } from '~/containers/ProtocolOverview/queries'
import { getTokenRiskData } from '~/containers/Token/queries'
import { getTokenBorrowRoutesDataFromNetwork } from '~/containers/Token/tokenBorrowRoutes.server'
import type { TokenBorrowRoutesResponse } from '~/containers/Token/tokenBorrowRoutes.types'
import type { TokenOverviewData } from '~/containers/Token/tokenOverview'
import { getTokenYieldsRowsFromNetwork } from '~/containers/Token/tokenYields.server'
import { fetchTokenRightsData, fetchTokenRightsEntryByDefillamaId } from '~/containers/TokenRights/api'
import type { ITokenRightsData } from '~/containers/TokenRights/api.types'
import type { IYieldTableRow } from '~/containers/Yields/Tables/types'
import TokenPage, { getStaticPaths, getStaticProps } from '~/pages/token/[token]'
import type { IProtocolMetadata } from '~/utils/metadata/types'
import type { TokenDirectory } from '~/utils/tokenDirectory'
import type { TokenRiskResponse } from './tokenRisk.types'
import type { RiskTimelineResponse } from './tokenRiskTimeline.types'

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

const overviewFixture: TokenOverviewData = {
	name: 'Bitcoin',
	displayName: 'BTC',
	symbol: 'BTC',
	llamaswapChains: null,
	marketData: {
		currentPrice: 100,
		percentChange24h: 5,
		ath: 120,
		athDate: '2024-01-01',
		atl: 1,
		atlDate: '2020-01-01',
		circulatingSupply: 21,
		totalSupply: 21,
		maxSupply: 21,
		mcap: 1000,
		fdv: 1500,
		volume24h: {
			total: 500,
			cex: 300,
			dex: 200
		}
	},
	treasury: null,
	raises: null,
	tokenLiquidity: null,
	outstandingFDV: null,
	rawChartData: {
		'Token Price': [
			[1711929600000, 100],
			[1712016000000, 110]
		]
	}
}

const state: {
	tokensJson: TokenDirectory
	tokenRightsEntries: unknown[]
	protocolMetadata: Record<string, IProtocolMetadata>
	chainMetadata: Record<string, { name: string }>
	liquidationsTokenSymbols: string[]
	liquidationsTokenSymbolsSet: Set<string>
	hasTokenLiquidationsData: boolean
	hasTokenMarkets: boolean
	emissionsProtocolsList: string[]
	incomeStatementData: unknown
	tokenRiskData: TokenRiskResponse | null
	tokenRiskTimelineData: RiskTimelineResponse | null
	initialYieldsRows: unknown[]
	initialTokenBorrowRoutesData: unknown
	tokenlist: Record<string, unknown>
} = {
	tokensJson: {
		btc: { name: 'Bitcoin', symbol: 'BTC', token_nk: 'coingecko:bitcoin', route: '/token/BTC', mcap_rank: 1 },
		eth: { name: 'Ethereum', symbol: 'ETH', token_nk: 'coingecko:ethereum', route: '/token/ETH', mcap_rank: 2 }
	},
	tokenRightsEntries: [],
	protocolMetadata: {},
	chainMetadata: {},
	liquidationsTokenSymbols: [],
	liquidationsTokenSymbolsSet: new Set<string>(),
	hasTokenLiquidationsData: false,
	hasTokenMarkets: false,
	emissionsProtocolsList: [],
	incomeStatementData: null,
	tokenRiskData: null,
	tokenRiskTimelineData: null,
	initialYieldsRows: [],
	initialTokenBorrowRoutesData: null,
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
		btc: { name: 'Bitcoin', symbol: 'BTC', token_nk: 'coingecko:bitcoin', route: '/token/BTC', mcap_rank: 1 },
		eth: { name: 'Ethereum', symbol: 'ETH', token_nk: 'coingecko:ethereum', route: '/token/ETH', mcap_rank: 2 }
	}
	state.tokenRightsEntries = []
	state.protocolMetadata = {}
	state.chainMetadata = {}
	state.liquidationsTokenSymbols = []
	state.liquidationsTokenSymbolsSet = new Set<string>()
	state.hasTokenLiquidationsData = false
	state.hasTokenMarkets = false
	state.emissionsProtocolsList = []
	state.incomeStatementData = null
	state.tokenRiskData = null
	state.tokenRiskTimelineData = null
	state.initialYieldsRows = []
	state.initialTokenBorrowRoutesData = null
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

function makeYieldRow(overrides: Partial<IYieldTableRow> = {}): IYieldTableRow {
	return {
		pool: 'stETH-ETH',
		project: 'Aave',
		projectslug: 'aave',
		configID: 'pool-1',
		chains: ['Ethereum'],
		tvl: 1_000_000,
		apy: 5.1,
		apyBase: null,
		apyReward: null,
		rewardTokensSymbols: [],
		rewards: [],
		change1d: null,
		change7d: null,
		confidence: null,
		url: 'https://example.com/pool-1',
		category: 'Lending',
		...overrides
	}
}

vi.mock('~/constants', async (importOriginal) => {
	const actual = await importOriginal<typeof import('~/constants')>()
	return {
		...actual,
		SKIP_BUILD_STATIC_GENERATION: false
	}
})

vi.mock('~/containers/Token/TokenOverviewSection', () => ({
	TokenOverviewSection: () => <section id="token-overview">token-overview-section</section>
}))

vi.mock('~/containers/Token/tokenOverview', () => ({
	getTokenOverviewData: vi.fn(() => Promise.resolve(overviewFixture)),
	TOKEN_OVERVIEW_DEFAULT_CHARTS: ['Token Price']
}))

vi.mock('~/containers/Token/TokenUsageSection', () => ({
	TokenUsageSection: () => <section id="token-usage">token-usage-section</section>
}))

vi.mock('~/containers/Token/TokenLiquidationsSection', () => ({
	TokenLiquidationsSection: () => <section id="token-liquidations">token-liquidations-section</section>
}))

vi.mock('~/containers/Token/TokenMarketsSection', () => ({
	TokenMarketsSection: () => <section id="token-markets">token-markets-section</section>
}))

vi.mock('~/containers/Token/api', () => ({
	hasTokenMarketsFromNetwork: vi.fn(() => Promise.resolve(state.hasTokenMarkets))
}))

vi.mock('~/containers/Token/TokenYieldsSection', () => ({
	TokenYieldsSection: () => <section id="token-yields">token-yields-section</section>
}))

vi.mock('~/containers/Token/TokenUnlocksSection', () => ({
	TokenUnlocksSection: ({ resolvedUnlocksSlug }: { resolvedUnlocksSlug?: string | null }) =>
		resolvedUnlocksSlug ? <section id="token-unlocks">{`token-unlocks-section:${resolvedUnlocksSlug}`}</section> : null
}))

vi.mock('~/containers/Token/TokenBorrowSection', () => ({
	TokenBorrowSection: () => <section id="token-borrow">token-borrow-section</section>
}))

vi.mock('~/containers/Token/TokenRisksSection', () => ({
	TokenRisksSection: () => <section id="token-risks">token-risks-section</section>
}))

vi.mock('~/containers/Token/TokenRiskTimelineSection', () => ({
	TokenRiskTimelineSection: () => <section id="token-risk-timeline">token-risk-timeline-section</section>
}))

vi.mock('~/containers/Token/TokenIncomeStatementSection', () => ({
	TokenIncomeStatementSection: () => <section id="token-income-statement">token-income-statement-section</section>
}))

vi.mock('~/containers/TokenRights/TokenRightsByProtocol', () => ({
	TokenRightsByProtocol: () => <section id="token-rights-and-value-accrual">token-rights-section</section>
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
	fetchTokenRightsData: vi.fn(() => Promise.resolve(state.tokenRightsEntries)),
	fetchTokenRightsEntryByDefillamaId: vi.fn((defillamaId: string) =>
		Promise.resolve(
			(state.tokenRightsEntries as Array<Record<string, unknown>>).find(
				(entry) => entry['DefiLlama ID'] === defillamaId
			) ?? null
		)
	)
}))

vi.mock('~/utils/metadata', () => ({
	__esModule: true,
	default: {
		get tokenDirectory() {
			return state.tokensJson
		},
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
			return state.chainMetadata
		},
		get liquidationsTokenSymbols() {
			return state.liquidationsTokenSymbols
		},
		get liquidationsTokenSymbolsSet() {
			return state.liquidationsTokenSymbolsSet
		},
		get emissionsProtocolsList() {
			return state.emissionsProtocolsList
		},
		get protocolDisplayNames() {
			return new Map<string, string>()
		},
		get chainDisplayNames() {
			return new Map<string, string>()
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

vi.mock('~/containers/Token/tokenRiskTimeline.server', () => ({
	getTokenRiskTimelineData: vi.fn(() => Promise.resolve(state.tokenRiskTimelineData))
}))

vi.mock('~/containers/Token/tokenYields.server', () => ({
	getTokenYieldsRowsFromNetwork: vi.fn(() => Promise.resolve(state.initialYieldsRows))
}))

vi.mock('~/containers/Token/tokenBorrowRoutes.server', () => ({
	getTokenBorrowRoutesDataFromNetwork: vi.fn(() => Promise.resolve(state.initialTokenBorrowRoutesData))
}))

vi.mock('~/containers/LiquidationsV2/queries', () => ({
	hasTokenLiquidationsDataFromNetwork: vi.fn(() => Promise.resolve(state.hasTokenLiquidationsData))
}))

afterEach(() => {
	resetState()
	vi.clearAllMocks()
})

describe('token page', () => {
	it('renders the sticky section nav and token sections in manifest order', () => {
		const html = renderToStaticMarkup(
			<TokenPage
				record={{ name: 'Bitcoin', symbol: 'BTC', token_nk: 'coingecko:bitcoin', tokenRights: true, is_yields: true }}
				displayName="BTC"
				tokenRightsData={tokenRightsFixture}
				incomeStatementData={{ data: {} }}
				incomeStatementProtocolName="Bitcoin Protocol"
				incomeStatementHasIncentives={false}
				tokenRiskData={{} as TokenRiskResponse}
				tokenRiskTimelineData={null}
				initialYieldsRows={[{ pool: 'pool-1' }] as IYieldTableRow[]}
				initialYieldsRowCount={1}
				initialYieldsChainList={[]}
				initialYieldsTokensList={[]}
				initialTokenBorrowRoutesData={
					{
						borrowAsCollateral: [{ pool: 'borrow-1' }],
						borrowAsDebt: []
					} as TokenBorrowRoutesResponse
				}
				initialTokenBorrowRoutesCounts={{
					borrowAsCollateral: 1,
					borrowAsDebt: 0
				}}
				initialTokenBorrowRoutesChainLists={{
					borrowAsCollateral: [],
					borrowAsDebt: []
				}}
				geckoId="bitcoin"
				hasLiquidations
				hasMarkets={false}
				resolvedUnlocksSlug="chainlink"
				overview={overviewFixture}
				seoTitle="title"
				seoDescription="description"
				canonicalUrl="/token/btc"
				visibleSections={[
					'token-overview',
					'token-income-statement',
					'token-risks',
					'token-rights-and-value-accrual',
					'token-usage',
					'token-liquidations',
					'token-unlocks',
					'token-yields',
					'token-borrow'
				]}
			/>
		)
		const navHtml = html.match(/<nav[^>]*aria-label="Token page sections"[^>]*>([\s\S]*?)<\/nav>/)?.[1] ?? ''

		expect(html).toContain('Overview')
		expect(html).toContain('Income Statement')
		expect(html).toContain('Risks')
		expect(html).toContain('Liquidations')
		expect(html).toContain('Token Rights')
		expect(html).toContain('Token Usage')
		expect(html).toContain('Unlocks')
		expect(html).toContain('Yields')
		expect(html).toContain('Borrow')
		expect(html).toContain('token-overview-section')
		expect(html).toContain('token-income-statement-section')
		expect(html).toContain('token-usage-section')
		expect(html).toContain('token-liquidations-section')
		expect(html).toContain('token-unlocks-section:chainlink')
		expect(html).toContain('token-yields-section')
		expect(html).toContain('token-borrow-section')
		expect(html).toContain('token-risks-section')
		expect(html).toContain('token-rights-section')
		expect(html).toContain('id="token-overview"')
		expect(html).toContain('id="token-income-statement"')
		expect(html).toContain('id="token-risks"')
		expect(html).toContain('id="token-rights-and-value-accrual"')
		expect(html).toContain('id="token-usage"')
		expect(html).toContain('id="token-liquidations"')
		expect(html).toContain('id="token-unlocks"')
		expect(html).toContain('id="token-yields"')
		expect(html).toContain('id="token-borrow"')
		expect(navHtml).toContain('>Overview<')
		expect(navHtml).toContain('>Income Statement<')
		expect(navHtml).toContain('>Risks<')
		expect(navHtml).toContain('>Token Rights<')
		expect(navHtml).toContain('>Token Usage<')
		expect(navHtml).toContain('>Liquidations<')
		expect(navHtml).toContain('>Unlocks<')
		expect(navHtml).toContain('>Yields<')
		expect(navHtml).toContain('>Borrow<')
		expect(html.indexOf('token-income-statement-section')).toBeGreaterThan(html.indexOf('token-overview-section'))
		expect(html.indexOf('token-risks-section')).toBeGreaterThan(html.indexOf('token-income-statement-section'))
		expect(html.indexOf('token-rights-section')).toBeGreaterThan(html.indexOf('token-risks-section'))
		expect(html.indexOf('token-usage-section')).toBeGreaterThan(html.indexOf('token-rights-section'))
		expect(html.indexOf('token-liquidations-section')).toBeGreaterThan(html.indexOf('token-usage-section'))
		expect(html.indexOf('token-unlocks-section:chainlink')).toBeGreaterThan(html.indexOf('token-liquidations-section'))
		expect(html.indexOf('token-yields-section')).toBeGreaterThan(html.indexOf('token-unlocks-section:chainlink'))
		expect(html.indexOf('token-borrow-section')).toBeGreaterThan(html.indexOf('token-yields-section'))
	})

	it('limits the section nav to the sections that actually render', () => {
		const html = renderToStaticMarkup(
			<TokenPage
				record={{ name: 'Bitcoin', symbol: 'BTC', token_nk: 'coingecko:bitcoin' }}
				displayName="BTC"
				tokenRightsData={null}
				incomeStatementData={null}
				incomeStatementProtocolName={null}
				incomeStatementHasIncentives={false}
				tokenRiskData={null}
				tokenRiskTimelineData={null}
				initialYieldsRows={[]}
				initialYieldsRowCount={0}
				initialYieldsChainList={[]}
				initialYieldsTokensList={[]}
				initialTokenBorrowRoutesData={null}
				initialTokenBorrowRoutesCounts={null}
				initialTokenBorrowRoutesChainLists={null}
				geckoId="bitcoin"
				hasLiquidations={false}
				hasMarkets={false}
				overview={overviewFixture}
				seoTitle="title"
				seoDescription="description"
				canonicalUrl="/token/btc"
				visibleSections={['token-overview', 'token-usage']}
			/>
		)
		const navHtml = html.match(/<nav[^>]*aria-label="Token page sections"[^>]*>([\s\S]*?)<\/nav>/)?.[1] ?? ''

		expect(html).toContain('Overview')
		expect(html).toContain('Token Usage')
		expect(html).not.toContain('token-yields-section')
		expect(html).not.toContain('token-borrow-section')
		expect(html).not.toContain('token-risks-section')
		expect(html).not.toContain('token-liquidations-section')
		expect(html).not.toContain('token-unlocks-section:')
		expect(navHtml).toContain('>Overview<')
		expect(navHtml).toContain('>Token Usage<')
		expect(navHtml).not.toContain('>Yields<')
		expect(navHtml).not.toContain('>Borrow<')
		expect(navHtml).not.toContain('>Risks<')
		expect(navHtml).not.toContain('>Liquidations<')
		expect(navHtml).not.toContain('>Unlocks<')
	})

	it('renders the markets section when hasMarkets is true', () => {
		const html = renderToStaticMarkup(
			<TokenPage
				record={{ name: 'Bitcoin', symbol: 'BTC', token_nk: 'coingecko:bitcoin' }}
				displayName="BTC"
				tokenRightsData={null}
				incomeStatementData={null}
				incomeStatementProtocolName={null}
				incomeStatementHasIncentives={false}
				tokenRiskData={null}
				tokenRiskTimelineData={null}
				initialYieldsRows={[]}
				initialYieldsRowCount={0}
				initialYieldsChainList={[]}
				initialYieldsTokensList={[]}
				initialTokenBorrowRoutesData={null}
				initialTokenBorrowRoutesCounts={null}
				initialTokenBorrowRoutesChainLists={null}
				geckoId="bitcoin"
				hasLiquidations={false}
				hasMarkets={true}
				overview={overviewFixture}
				seoTitle="title"
				seoDescription="description"
				canonicalUrl="/token/btc"
				visibleSections={['token-overview', 'token-markets', 'token-usage']}
			/>
		)
		const navHtml = html.match(/<nav[^>]*aria-label="Token page sections"[^>]*>([\s\S]*?)<\/nav>/)?.[1] ?? ''

		expect(html).toContain('token-markets-section')
		expect(html).toContain('id="token-markets"')
		expect(navHtml).toContain('>Markets<')
		expect(html.indexOf('token-markets-section')).toBeGreaterThan(html.indexOf('token-overview-section'))
		expect(html.indexOf('token-usage-section')).toBeGreaterThan(html.indexOf('token-markets-section'))
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
				tokenRiskTimelineData={null}
				initialYieldsRows={[]}
				initialYieldsRowCount={0}
				initialYieldsChainList={[]}
				initialYieldsTokensList={[]}
				initialTokenBorrowRoutesData={
					{
						borrowAsCollateral: [{ pool: 'borrow-1' }],
						borrowAsDebt: []
					} as TokenBorrowRoutesResponse
				}
				initialTokenBorrowRoutesCounts={{
					borrowAsCollateral: 1,
					borrowAsDebt: 0
				}}
				initialTokenBorrowRoutesChainLists={{
					borrowAsCollateral: [],
					borrowAsDebt: []
				}}
				geckoId="bitcoin"
				hasLiquidations={false}
				hasMarkets={false}
				overview={overviewFixture}
				seoTitle="title"
				seoDescription="description"
				canonicalUrl="/token/btc"
				visibleSections={['token-overview', 'token-risks', 'token-usage', 'token-borrow']}
			/>
		)

		expect(html).not.toContain('token-yields-section')
		expect(html).toContain('token-borrow-section')
		expect(html).toContain('token-risks-section')
		expect(html).not.toContain('token-unlocks-section:')
	})

	it('getStaticPaths prerenders top market cap token routes with blocking fallback', async () => {
		state.tokensJson = {
			btc: { name: 'Bitcoin', symbol: 'BTC', token_nk: 'coingecko:bitcoin', route: '/token/BTC', mcap_rank: 1 },
			eth: { name: 'Ethereum', symbol: 'ETH', token_nk: 'coingecko:ethereum', route: '/token/ETH', mcap_rank: 2 },
			swing: {
				name: 'Swing.xyz',
				symbol: '$SWING',
				token_nk: 'coingecko:swing-xyz',
				route: '/token/%24SWING',
				mcap_rank: 30
			},
			link: { name: 'Chainlink', symbol: 'LINK', token_nk: 'coingecko:chainlink', route: '/token/LINK', mcap_rank: 31 },
			aave: { name: 'Aave', symbol: 'AAVE', token_nk: 'coingecko:aave' }
		}

		await expect(getStaticPaths()).resolves.toEqual({
			paths: ['/token/BTC', '/token/ETH', '/token/%24SWING'],
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
		await expect(getStaticProps({ params: { token: 'BTC' } } as never)).resolves.toMatchObject({
			props: {
				record: { name: 'Bitcoin', symbol: 'BTC', token_nk: 'coingecko:bitcoin', route: '/token/BTC', mcap_rank: 1 },
				displayName: 'BTC',
				tokenRightsData: null,
				incomeStatementData: null,
				incomeStatementProtocolName: null,
				incomeStatementHasIncentives: false,
				geckoId: 'bitcoin',
				tokenRiskData: null,
				tokenRiskTimelineData: null,
				initialYieldsRows: [],
				initialTokenBorrowRoutesData: null,
				hasLiquidations: false,
				hasMarkets: false,
				overview: overviewFixture,
				seoTitle: 'BTC Price, Market Cap, Supply & Trading Volume',
				seoDescription: 'Track BTC price, market cap, circulating supply, max supply, and trading volume.',
				canonicalUrl: '/token/BTC',
				visibleSections: ['token-overview', 'token-usage']
			},
			revalidate: 123
		})
	})

	it('getStaticProps keeps the canonical URL metadata-defined for lowercase token params', async () => {
		await expect(getStaticProps({ params: { token: 'btc' } } as never)).resolves.toMatchObject({
			props: {
				record: { name: 'Bitcoin', symbol: 'BTC', token_nk: 'coingecko:bitcoin', route: '/token/BTC', mcap_rank: 1 },
				displayName: 'BTC',
				tokenRightsData: null,
				incomeStatementData: null,
				incomeStatementProtocolName: null,
				incomeStatementHasIncentives: false,
				geckoId: 'bitcoin',
				tokenRiskData: null,
				tokenRiskTimelineData: null,
				initialYieldsRows: [],
				initialTokenBorrowRoutesData: null,
				hasLiquidations: false,
				hasMarkets: false,
				overview: overviewFixture,
				seoTitle: 'BTC Price, Market Cap, Supply & Trading Volume',
				seoDescription: 'Track BTC price, market cap, circulating supply, max supply, and trading volume.',
				canonicalUrl: '/token/BTC',
				visibleSections: ['token-overview', 'token-usage']
			},
			revalidate: 123
		})
	})

	it('getStaticProps enables the liquidations section when metadata includes the token symbol with rows', async () => {
		state.liquidationsTokenSymbols = ['BTC']
		state.liquidationsTokenSymbolsSet = new Set(['BTC'])
		state.hasTokenLiquidationsData = true

		const result = await getStaticProps({ params: { token: 'btc' } } as never)

		expect('props' in result).toBe(true)
		if (!('props' in result)) throw new Error('expected props')

		expect(result.props.hasLiquidations).toBe(true)
		expect(result.props.visibleSections).toContain('token-liquidations')
	})

	it('getStaticProps skips the liquidations section when metadata has the token but no rows', async () => {
		state.liquidationsTokenSymbols = ['BTC']
		state.liquidationsTokenSymbolsSet = new Set(['BTC'])

		const result = await getStaticProps({ params: { token: 'btc' } } as never)

		expect('props' in result).toBe(true)
		if (!('props' in result)) throw new Error('expected props')

		expect(result.props.hasLiquidations).toBe(false)
		expect(result.props.visibleSections).not.toContain('token-liquidations')
	})

	it('getStaticProps does not resolve by token name slug', async () => {
		await expect(getStaticProps({ params: { token: 'bitcoin' } } as never)).resolves.toEqual({
			notFound: true,
			revalidate: 123
		})
	})

	it('getStaticProps returns props even when token market stats are missing', async () => {
		state.tokensJson = {
			btc: { name: 'Bitcoin', symbol: 'BTC', route: '/token/BTC' }
		}
		state.tokenlist = {}

		await expect(getStaticProps({ params: { token: 'btc' } } as never)).resolves.toMatchObject({
			props: {
				record: { name: 'Bitcoin', symbol: 'BTC', route: '/token/BTC' },
				displayName: 'BTC',
				tokenRightsData: null,
				incomeStatementData: null,
				incomeStatementProtocolName: null,
				incomeStatementHasIncentives: false,
				geckoId: null,
				tokenRiskData: null,
				tokenRiskTimelineData: null,
				initialYieldsRows: [],
				initialTokenBorrowRoutesData: null,
				hasLiquidations: false,
				hasMarkets: false,
				overview: overviewFixture,
				seoTitle: 'BTC Price, Market Cap, Supply & Trading Volume',
				seoDescription: 'Track BTC price, market cap, circulating supply, max supply, and trading volume.',
				canonicalUrl: '/token/BTC',
				visibleSections: ['token-overview', 'token-usage']
			},
			revalidate: 123
		})
	})

	it('getStaticProps falls back to an encoded symbol when metadata route is missing', async () => {
		state.tokensJson = {
			swing: { name: 'Swing.xyz', symbol: '$SWING', token_nk: 'coingecko:swing-xyz' }
		}
		state.tokenlist = {
			'swing-xyz': {
				symbol: '$swing',
				current_price: 1,
				price_change_24h: 0,
				price_change_percentage_24h: 0,
				ath: null,
				ath_date: null,
				atl: null,
				atl_date: null,
				market_cap: 10,
				fully_diluted_valuation: 10,
				total_volume: 1,
				total_supply: null,
				circulating_supply: 10,
				max_supply: 10
			}
		}

		await expect(getStaticProps({ params: { token: 'swing' } } as never)).resolves.toMatchObject({
			props: {
				record: { name: 'Swing.xyz', symbol: '$SWING', token_nk: 'coingecko:swing-xyz' },
				displayName: 'Swing.xyz',
				tokenRightsData: null,
				incomeStatementData: null,
				incomeStatementProtocolName: null,
				incomeStatementHasIncentives: false,
				geckoId: 'swing-xyz',
				tokenRiskData: null,
				tokenRiskTimelineData: null,
				initialYieldsRows: [],
				initialTokenBorrowRoutesData: null,
				hasLiquidations: false,
				hasMarkets: false,
				overview: overviewFixture,
				seoTitle: 'Swing.xyz Price, Market Cap, Supply & Trading Volume',
				seoDescription: 'Track Swing.xyz price, market cap, circulating supply, max supply, and trading volume.',
				canonicalUrl: '/token/%24SWING',
				visibleSections: ['token-overview', 'token-usage']
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
		await expect(getStaticProps({ params: { token: 'link' } } as never)).resolves.toMatchObject({
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
				tokenRiskTimelineData: null,
				initialYieldsRows: [],
				initialTokenBorrowRoutesData: null,
				hasLiquidations: false,
				hasMarkets: false,
				overview: overviewFixture,
				seoTitle: 'LINK Price, Market Cap, Supply, Trading Volume & Token Rights',
				seoDescription:
					'Track LINK price, market cap, circulating supply, max supply, trading volume, and token rights.',
				canonicalUrl: '/token/LINK',
				visibleSections: ['token-overview', 'token-rights-and-value-accrual', 'token-usage']
			},
			revalidate: 123
		})
	})

	it('getStaticProps includes token rights data for flagged tokens without protocol metadata', async () => {
		state.tokenRightsEntries = [
			{
				'Protocol Name': 'Backpack',
				Token: ['BP', 'sBP'],
				'Token Type': ['Utility'],
				'Brief description': 'desc',
				'Governance Details (Summary)': 'gov summary',
				'Governance Decisions': ['N/A'],
				'Treasury Decisions': ['N/A'],
				'Revenue Decisions': ['N/A'],
				'Fee Switch Status': 'OFF',
				Buybacks: ['N/A'],
				Dividends: ['N/A'],
				Burns: 'N/A',
				'Associated Entities': [],
				'DefiLlama ID': '4266'
			}
		]
		state.tokensJson = {
			bp: {
				name: 'Backpack',
				symbol: 'BP',
				token_nk: 'coingecko:backpack',
				route: '/token/BP',
				tokenRights: true
			}
		}
		state.tokenlist = {
			backpack: {
				symbol: 'bp',
				current_price: 1,
				price_change_24h: 0,
				price_change_percentage_24h: 0,
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

		const result = await getStaticProps({ params: { token: 'bp' } } as never)

		expect('props' in result).toBe(true)
		if (!('props' in result)) throw new Error('expected props')

		expect(result.props.tokenRightsData?.overview).toEqual({
			protocolName: 'Backpack',
			tokens: ['BP', 'sBP'],
			tokenTypes: ['Utility'],
			description: 'desc',
			utility: null,
			lastUpdated: null
		})
		expect(result.props.visibleSections).toEqual(['token-overview', 'token-rights-and-value-accrual', 'token-usage'])
		expect(fetchTokenRightsData).toHaveBeenCalledTimes(1)
		expect(fetchTokenRightsEntryByDefillamaId).not.toHaveBeenCalled()
	})

	it('getStaticProps skips token rights for flagged tokens without a matching row', async () => {
		state.tokenRightsEntries = [
			{
				'Protocol Name': 'Other',
				Token: ['OTHER'],
				'Token Type': ['Utility'],
				'Brief description': 'desc',
				'Governance Details (Summary)': 'gov summary',
				'Governance Decisions': ['N/A'],
				'Treasury Decisions': ['N/A'],
				'Revenue Decisions': ['N/A'],
				'Fee Switch Status': 'OFF',
				Buybacks: ['N/A'],
				Dividends: ['N/A'],
				Burns: 'N/A',
				'Associated Entities': [],
				'DefiLlama ID': '9999'
			}
		]
		state.tokensJson = {
			bp: {
				name: 'Backpack',
				symbol: 'BP',
				token_nk: 'coingecko:backpack',
				tokenRights: true
			}
		}
		state.tokenlist = {
			backpack: {
				symbol: 'bp',
				current_price: 1,
				price_change_percentage_24h: 0,
				market_cap: 100,
				fully_diluted_valuation: 150,
				total_volume: 50,
				circulating_supply: 20,
				max_supply: 1000
			}
		}

		const result = await getStaticProps({ params: { token: 'bp' } } as never)

		expect('props' in result).toBe(true)
		if (!('props' in result)) throw new Error('expected props')

		expect(result.props.tokenRightsData).toBeNull()
		expect(result.props.visibleSections).toEqual(['token-overview', 'token-usage'])
	})

	it('getStaticProps resolves embedded unlocks by protocol display name when the slug is cached', async () => {
		state.tokensJson = {
			link: {
				name: 'Chainlink',
				symbol: 'LINK',
				token_nk: 'coingecko:chainlink',
				protocolId: 'parent#chainlink'
			}
		}
		state.protocolMetadata = {
			'parent#chainlink': {
				displayName: 'Chainlink'
			} as IProtocolMetadata
		}
		state.emissionsProtocolsList = ['chainlink']
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

		const result = await getStaticProps({ params: { token: 'link' } } as never)

		expect('props' in result).toBe(true)
		if (!('props' in result)) throw new Error('expected props')

		expect(result.props.resolvedUnlocksSlug).toBe('chainlink')
	})

	it('getStaticProps falls back to chain-name unlock slugs when the chain is cached', async () => {
		state.tokensJson = {
			sol: {
				name: 'Solana',
				symbol: 'SOL',
				token_nk: 'coingecko:solana',
				chainId: 'solana'
			}
		}
		state.chainMetadata = {
			solana: {
				name: 'Solana'
			}
		}
		state.emissionsProtocolsList = ['solana']
		state.tokenlist = {
			solana: {
				symbol: 'sol',
				current_price: 10,
				price_change_percentage_24h: 10,
				market_cap: 100,
				fully_diluted_valuation: 150,
				total_volume: 50,
				circulating_supply: 20,
				max_supply: 1000
			}
		}

		const result = await getStaticProps({ params: { token: 'sol' } } as never)

		expect('props' in result).toBe(true)
		if (!('props' in result)) throw new Error('expected props')

		expect(result.props.resolvedUnlocksSlug).toBe('solana')
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

		await expect(getStaticProps({ params: { token: 'aave' } } as never)).resolves.toMatchObject({
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
				tokenRiskTimelineData: null,
				initialYieldsRows: [],
				initialTokenBorrowRoutesData: null,
				hasLiquidations: false,
				hasMarkets: false,
				overview: overviewFixture,
				seoTitle: 'AAVE Price, Market Cap, Supply & Trading Volume',
				seoDescription: 'Track AAVE price, market cap, circulating supply, max supply, and trading volume.',
				canonicalUrl: '/token/AAVE',
				visibleSections: ['token-overview', 'token-income-statement', 'token-usage']
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
		state.initialYieldsRows = [makeYieldRow({ pool: 'pool-1' })]
		state.initialTokenBorrowRoutesData = {
			borrowAsCollateral: [],
			borrowAsDebt: []
		}

		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
		vi.mocked(getTokenRiskData).mockRejectedValueOnce(new Error('risk failed'))

		const result = await getStaticProps({ params: { token: 'link' } } as never)

		expect('props' in result).toBe(true)
		if (!('props' in result)) throw new Error('expected props')

		expect(result.props.tokenRiskData).toBeNull()
		expect(result.props.initialYieldsRows).toEqual(state.initialYieldsRows)
		expect(result.props.initialYieldsRowCount).toBe(state.initialYieldsRows.length)
		expect(result.props.initialTokenBorrowRoutesData).toEqual(state.initialTokenBorrowRoutesData)
		expect(result.props.initialTokenBorrowRoutesCounts).toEqual({
			borrowAsCollateral: 0,
			borrowAsDebt: 0
		})
		expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to load token risk data for chainlink', expect.any(Error))

		consoleErrorSpy.mockRestore()
	})

	it('getStaticProps limits prefetched yields tables to the first page while preserving total counts', async () => {
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
		state.initialYieldsRows = Array.from({ length: 12 }, (_, index) => ({
			pool: `LINK-USDC-${index}`,
			chains: ['Ethereum']
		}))
		state.initialTokenBorrowRoutesData = {
			borrowAsCollateral: Array.from({ length: 13 }, (_, index) => ({
				pool: `collateral-${index}`,
				chains: ['Ethereum']
			})),
			borrowAsDebt: Array.from({ length: 11 }, (_, index) => ({
				pool: `debt-${index}`,
				chains: ['Arbitrum']
			}))
		}

		const result = await getStaticProps({ params: { token: 'link' } } as never)

		expect('props' in result).toBe(true)
		if (!('props' in result)) throw new Error('expected props')

		expect(result.props.initialYieldsRows).toHaveLength(10)
		expect(result.props.initialYieldsRowCount).toBe(12)
		expect(result.props.initialTokenBorrowRoutesData?.borrowAsCollateral).toHaveLength(10)
		expect(result.props.initialTokenBorrowRoutesData?.borrowAsDebt).toHaveLength(10)
		expect(result.props.initialTokenBorrowRoutesCounts).toEqual({
			borrowAsCollateral: 13,
			borrowAsDebt: 11
		})
	})

	it('getStaticProps keeps the page renderable when optional token fetches fail', async () => {
		state.tokensJson = {
			link: {
				name: 'Chainlink',
				symbol: 'LINK',
				token_nk: 'coingecko:chainlink',
				protocolId: 'parent#chainlink',
				tokenRights: true,
				is_yields: true
			}
		}
		state.protocolMetadata = {
			'parent#chainlink': {
				name: 'chainlink',
				displayName: 'Chainlink',
				incentives: true
			} as IProtocolMetadata
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

		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
		vi.mocked(fetchTokenRightsEntryByDefillamaId).mockRejectedValueOnce(new Error('token rights failed'))
		vi.mocked(getProtocolIncomeStatement).mockRejectedValueOnce(new Error('income failed'))
		vi.mocked(getTokenYieldsRowsFromNetwork).mockRejectedValueOnce(new Error('yields failed'))
		vi.mocked(getTokenBorrowRoutesDataFromNetwork).mockRejectedValueOnce(new Error('borrow routes failed'))
		vi.mocked(getTokenRiskData).mockRejectedValueOnce(new Error('risk failed'))

		const result = await getStaticProps({ params: { token: 'link' } } as never)

		expect('props' in result).toBe(true)
		if (!('props' in result)) throw new Error('expected props')

		expect(result.props.tokenRightsData).toBeNull()
		expect(result.props.incomeStatementData).toBeNull()
		expect(result.props.incomeStatementProtocolName).toBeNull()
		expect(result.props.incomeStatementHasIncentives).toBe(false)
		expect(result.props.initialYieldsRows).toEqual([])
		expect(result.props.initialYieldsRowCount).toBe(0)
		expect(result.props.initialTokenBorrowRoutesData).toBeNull()
		expect(result.props.initialTokenBorrowRoutesCounts).toBeNull()
		expect(result.props.tokenRiskData).toBeNull()
		expect(consoleErrorSpy).toHaveBeenCalledWith(
			'Failed to load token rights data for parent#chainlink',
			expect.any(Error)
		)
		expect(consoleErrorSpy).toHaveBeenCalledWith(
			'Failed to load income statement data for Chainlink',
			expect.any(Error)
		)
		expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to load token yields data for LINK', expect.any(Error))
		expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to load token borrow routes data for LINK', expect.any(Error))
		expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to load token risk data for chainlink', expect.any(Error))

		consoleErrorSpy.mockRestore()
	})

	it('renders the risks section only when getStaticProps returns token risk data', async () => {
		state.tokensJson = {
			link: {
				name: 'Chainlink',
				symbol: 'LINK',
				token_nk: 'coingecko:chainlink'
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
		expect(withoutRiskHtml).not.toContain('token-risks-section')

		state.tokenRiskData = {
			candidates: [{ key: 'ethereum:0x5149', chain: 'ethereum', address: '0x5149', displayName: 'Ethereum' }],
			scopeCandidates: [{ key: 'ethereum:0x5149', chain: 'ethereum', address: '0x5149', displayName: 'Ethereum' }],
			selectedCandidateKey: null,
			exposures: {
				summary: {
					totalCurrentMaxBorrowUsd: 10,
					totalMinBadDebtAtPriceZeroUsd: 6,
					exposureCount: 1,
					protocolCount: 1,
					chainCount: 1,
					minBadDebtKnownCount: 1,
					minBadDebtUnknownCount: 0
				},
				rows: [
					{
						protocol: 'aave-v3',
						protocolDisplayName: 'Aave V3',
						chain: 'ethereum',
						chainDisplayName: 'Ethereum',
						assetSymbol: 'LINK',
						assetAddress: '0x5149',
						currentMaxBorrowUsd: 10,
						minBadDebtAtPriceZeroUsd: 6,
						minBadDebtAtPriceZeroCoverage: 'known'
					}
				],
				methodologies: {
					asset: 'asset',
					currentMaxBorrowUsd: 'cap',
					minBadDebtAtPriceZeroUsd: 'zero-price'
				}
			},
			limitations: ['limit']
		}

		const withRisk = await getStaticProps({ params: { token: 'link' } } as never)
		if (!('props' in withRisk)) throw new Error('expected props')

		const withRiskHtml = renderToStaticMarkup(<TokenPage {...withRisk.props} />)
		expect(withRiskHtml).not.toContain('token-yields-section')
		expect(withRiskHtml).not.toContain('token-borrow-section')
		expect(withRiskHtml).toContain('token-risks-section')
	})
})
