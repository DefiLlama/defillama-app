import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getProtocolIncomeStatement } from '~/containers/ProtocolOverview/queries'
import { getTokenRiskData } from '~/containers/Token/queries'
import type { TokenOverviewData } from '~/containers/Token/tokenOverview'
import type { TokenPageProps, TokenPageSection } from '~/containers/Token/types'
import type { ITokenRightsData } from '~/containers/TokenRights/api.types'
import type { ProtocolEmissionSupplyMetricsMap } from '~/containers/Unlocks/api.types'
import type { IYieldTableRow, IYieldsOptimizerTableRow } from '~/containers/Yields/Tables/types'
import TokenPage, { getStaticPaths, getStaticProps } from '~/pages/token/[token]'
import { DatasetCacheIntegrityError } from '~/server/datasetCache/core'
import { hasTokenLiquidationsData } from '~/server/datasetCache/runtime/liquidations'
import {
	fetchTokenRightsEntries,
	fetchTokenRightsEntryByDefillamaId,
	fetchTokenRightsEntryByName
} from '~/server/datasetCache/runtime/tokenRights'
import { getTokenBorrowRoutes, getTokenYieldsRows } from '~/server/datasetCache/runtime/yields'
import type { IProtocolMetadata } from '~/utils/metadata/types'
import type { TokenDirectory } from '~/utils/tokenDirectory'
import type { TokenRiskResponse } from '../tokenRisk.types'
import { buildTokenRiskProtocolSummaries } from '../tokenRisk.utils'
import type { RiskTimelineResponse } from '../tokenRiskTimeline.types'

const { capturedTokenNavSections, renderedTokenSections } = vi.hoisted(() => ({
	capturedTokenNavSections: [] as Array<{ id: string; label: string }>,
	renderedTokenSections: [] as string[]
}))

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
	emissionsSupplyMetrics: ProtocolEmissionSupplyMetricsMap
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
	emissionsSupplyMetrics: {},
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
	state.emissionsSupplyMetrics = {}
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

function makeBorrowRouteRow(overrides: Partial<IYieldsOptimizerTableRow> = {}): IYieldsOptimizerTableRow {
	const row: IYieldsOptimizerTableRow = {
		...makeYieldRow(),
		projectName: 'Aave',
		symbol: 'ETH',
		borrow: undefined as unknown as IYieldsOptimizerTableRow,
		rewardTokensNames: [],
		totalAvailableUsd: 500_000,
		lendUSDAmount: 0,
		borrowUSDAmount: 0,
		lendAmount: 0,
		borrowAmount: 0,
		...overrides
	}
	row.borrow = row
	return row
}

function makeTokenPageProps(sections: TokenPageSection[]): TokenPageProps {
	return {
		seoTitle: 'title',
		seoDescription: 'description',
		canonicalUrl: '/token/btc',
		sections
	}
}

function makeOverviewSection(overrides: Partial<Extract<TokenPageSection, { id: 'token-overview' }>> = {}) {
	return {
		id: 'token-overview',
		label: 'Overview',
		overview: overviewFixture,
		geckoId: 'bitcoin',
		logo: null,
		issuer: null,
		...overrides
	} satisfies TokenPageSection
}

function makeUsageSection(tokenSymbol = 'BTC') {
	return {
		id: 'token-usage',
		label: 'Token Usage',
		tokenSymbol
	} satisfies TokenPageSection
}

function tokenPageSectionIds(sections: TokenPageSection[]): string[] {
	return sections.map((section) => section.id)
}

function findTokenPageSection<Id extends TokenPageSection['id']>(
	sections: TokenPageSection[],
	id: Id
): Extract<TokenPageSection, { id: Id }> | undefined {
	return sections.find((section): section is Extract<TokenPageSection, { id: Id }> => section.id === id)
}

function normalizeName(value: string): string {
	return value
		.toLowerCase()
		.replaceAll(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
}

vi.mock('~/constants', async (importOriginal) => {
	const actual = await importOriginal<typeof import('~/constants')>()
	return {
		...actual,
		SKIP_BUILD_STATIC_GENERATION: false
	}
})

vi.mock('~/containers/Token/TokenOverviewSection', () => ({
	TokenOverviewSection: () => {
		renderedTokenSections.push('token-overview')
		return null
	}
}))

vi.mock('~/containers/Token/tokenOverview', () => ({
	getTokenOverviewData: vi.fn(() => Promise.resolve(overviewFixture)),
	TOKEN_OVERVIEW_DEFAULT_CHARTS: ['Token Price']
}))

vi.mock('~/containers/Token/TokenUsageSection', () => ({
	TokenUsageSection: () => {
		renderedTokenSections.push('token-usage')
		return null
	}
}))

vi.mock('~/containers/Token/TokenLiquidationsSection', () => ({
	TokenLiquidationsSection: () => {
		renderedTokenSections.push('token-liquidations')
		return null
	}
}))

vi.mock('~/containers/Token/TokenMarketsSection', () => ({
	TokenMarketsSection: () => {
		renderedTokenSections.push('token-markets')
		return null
	}
}))

vi.mock('~/server/datasetCache/runtime/markets', () => ({
	hasTokenMarkets: vi.fn((symbol: string) => Promise.resolve(symbol.toLowerCase() === 'btc'))
}))

vi.mock('~/containers/Token/TokenYieldsSection', () => ({
	TokenYieldsSection: () => {
		renderedTokenSections.push('token-yields')
		return null
	}
}))

vi.mock('~/containers/Token/TokenUnlocksSection', () => ({
	TokenUnlocksSection: ({ resolvedUnlocksSlug }: { resolvedUnlocksSlug?: string | null }) => {
		if (!resolvedUnlocksSlug) return null
		renderedTokenSections.push('token-unlocks')
		return null
	}
}))

vi.mock('~/containers/Token/TokenBorrowSection', () => ({
	TokenBorrowSection: () => {
		renderedTokenSections.push('token-borrow')
		return null
	}
}))

vi.mock('~/containers/Token/TokenRisksSection', () => ({
	TokenRisksSection: () => {
		renderedTokenSections.push('token-risks')
		return null
	}
}))

vi.mock('~/containers/Token/TokenRiskTimelineSection', () => ({
	TokenRiskTimelineSection: () => {
		renderedTokenSections.push('token-risk-timeline')
		return null
	}
}))

vi.mock('~/containers/Token/TokenIncomeStatementSection', () => ({
	TokenIncomeStatementSection: () => {
		renderedTokenSections.push('token-income-statement')
		return null
	}
}))

vi.mock('~/containers/TokenRights/TokenRightsByProtocol', () => ({
	TokenRightsByProtocol: () => {
		renderedTokenSections.push('token-rights-and-value-accrual')
		return null
	}
}))

vi.mock('~/containers/Token/TokenPageSectionNav', () => ({
	TokenPageSectionNav: ({ sections }: { sections: Array<{ id: string; label: string }> }) => {
		capturedTokenNavSections.length = 0
		capturedTokenNavSections.push(...sections)
		return null
	}
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

vi.mock('~/server/datasetCache/runtime/tokenRights', () => ({
	fetchTokenRightsEntries: vi.fn(() => Promise.resolve(state.tokenRightsEntries)),
	fetchTokenRightsEntryByDefillamaId: vi.fn((defillamaId: string) =>
		Promise.resolve(
			(state.tokenRightsEntries as Array<Record<string, unknown>>).find(
				(entry) => entry['DefiLlama ID'] === defillamaId
			) ?? null
		)
	),
	fetchTokenRightsEntryByName: vi.fn((protocolName: string) => {
		const normalizedName = normalizeName(protocolName)
		return Promise.resolve(
			(state.tokenRightsEntries as Array<Record<string, unknown>>).find(
				(entry) => normalizeName(String(entry['Protocol Name'] ?? '')) === normalizedName
			) ?? null
		)
	})
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
		get emissionsSupplyMetrics() {
			return state.emissionsSupplyMetrics
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

vi.mock('~/containers/Token/queries', async (importOriginal) => ({
	...(await importOriginal<typeof import('~/containers/Token/queries')>()),
	getTokenRiskData: vi.fn(() => Promise.resolve(state.tokenRiskData))
}))

vi.mock('~/containers/Token/tokenRiskTimeline.server', () => ({
	getTokenRiskTimelineData: vi.fn(() => Promise.resolve(state.tokenRiskTimelineData))
}))

vi.mock('~/server/datasetCache/runtime/yields', () => ({
	getTokenYieldsRows: vi.fn(() => Promise.resolve(state.initialYieldsRows)),
	getTokenBorrowRoutes: vi.fn(() => Promise.resolve(state.initialTokenBorrowRoutesData)),
	getYieldConfig: vi.fn(() => Promise.resolve(null))
}))

vi.mock('~/server/datasetCache/runtime/liquidations', () => ({
	hasTokenLiquidationsData: vi.fn(() => Promise.resolve(state.hasTokenLiquidationsData)),
	getTokenLiquidationsSectionData: vi.fn()
}))

vi.mock('~/server/datasetCache/runtime/raises', () => ({
	fetchRaisesByDefillamaId: vi.fn().mockResolvedValue([])
}))

vi.mock('~/server/datasetCache/runtime/treasuries', () => ({
	fetchTreasuryById: vi.fn().mockResolvedValue(null)
}))

vi.mock('~/server/datasetCache/runtime/liquidity', () => ({
	fetchLiquidityEntryByProtocolId: vi.fn().mockResolvedValue(null)
}))

vi.mock('~/server/datasetCache/runtime/risk', () => ({
	getIndexedTokenRiskBorrowCapacity: vi.fn().mockResolvedValue({})
}))

afterEach(() => {
	resetState()
	capturedTokenNavSections.length = 0
	renderedTokenSections.length = 0
	vi.clearAllMocks()
})

describe('token page', () => {
	it('renders the sticky section nav and token sections in manifest order', () => {
		const sections: TokenPageSection[] = [
			makeOverviewSection(),
			{
				id: 'token-income-statement',
				label: 'Income Statement',
				protocolName: 'Bitcoin Protocol',
				incomeStatement: { data: {} } as never,
				hasIncentives: false
			},
			{
				id: 'token-risks',
				label: 'Risks',
				tokenSymbol: 'BTC',
				riskData: {} as TokenRiskResponse
			},
			{
				id: 'token-rights-and-value-accrual',
				label: 'Token Rights',
				name: 'Bitcoin',
				symbol: 'BTC',
				tokenRightsData: tokenRightsFixture
			},
			makeUsageSection(),
			{
				id: 'token-liquidations',
				label: 'Liquidations',
				tokenSymbol: 'BTC'
			},
			{
				id: 'token-unlocks',
				label: 'Unlocks',
				resolvedUnlocksSlug: 'chainlink'
			},
			{
				id: 'token-yields',
				label: 'Yields',
				tokenSymbol: 'BTC',
				hydration: {
					rows: [makeYieldRow({ pool: 'pool-1' })],
					rowCount: 1,
					chainList: [],
					tokensList: [],
					pageSize: 10
				}
			},
			{
				id: 'token-borrow',
				label: 'Borrow',
				tokenSymbol: 'BTC',
				hydration: {
					data: {
						borrowAsCollateral: [makeBorrowRouteRow({ pool: 'borrow-1' })],
						borrowAsDebt: []
					},
					counts: {
						borrowAsCollateral: 1,
						borrowAsDebt: 0
					},
					chainLists: {
						borrowAsCollateral: [],
						borrowAsDebt: []
					},
					pageSize: 10
				}
			}
		]

		renderToStaticMarkup(<TokenPage {...makeTokenPageProps(sections)} />)

		expect(capturedTokenNavSections).toEqual([
			{ id: 'token-overview', label: 'Overview' },
			{ id: 'token-income-statement', label: 'Income Statement' },
			{ id: 'token-risks', label: 'Risks' },
			{ id: 'token-rights-and-value-accrual', label: 'Token Rights' },
			{ id: 'token-usage', label: 'Token Usage' },
			{ id: 'token-liquidations', label: 'Liquidations' },
			{ id: 'token-unlocks', label: 'Unlocks' },
			{ id: 'token-yields', label: 'Yields' },
			{ id: 'token-borrow', label: 'Borrow' }
		])
		expect(renderedTokenSections).toEqual(sections.map((section) => section.id))
	})

	it('limits the section nav to the sections that actually render', () => {
		renderToStaticMarkup(<TokenPage {...makeTokenPageProps([makeOverviewSection(), makeUsageSection()])} />)

		expect(capturedTokenNavSections).toEqual([
			{ id: 'token-overview', label: 'Overview' },
			{ id: 'token-usage', label: 'Token Usage' }
		])
		expect(renderedTokenSections).toEqual(['token-overview', 'token-usage'])
	})

	it('renders the markets section when hasMarkets is true', () => {
		renderToStaticMarkup(
			<TokenPage
				{...makeTokenPageProps([
					makeOverviewSection(),
					{
						id: 'token-markets',
						label: 'Markets',
						tokenSymbol: 'BTC'
					},
					makeUsageSection()
				])}
			/>
		)

		expect(capturedTokenNavSections).toContainEqual({ id: 'token-markets', label: 'Markets' })
		expect(renderedTokenSections).toEqual(['token-overview', 'token-markets', 'token-usage'])
	})

	it('renders each yield-related section from its own prefetched dataset', () => {
		renderToStaticMarkup(
			<TokenPage
				{...makeTokenPageProps([
					makeOverviewSection(),
					{
						id: 'token-risks',
						label: 'Risks',
						tokenSymbol: 'BTC',
						riskData: {} as TokenRiskResponse
					},
					makeUsageSection(),
					{
						id: 'token-borrow',
						label: 'Borrow',
						tokenSymbol: 'BTC',
						hydration: {
							data: {
								borrowAsCollateral: [makeBorrowRouteRow({ pool: 'borrow-1' })],
								borrowAsDebt: []
							},
							counts: {
								borrowAsCollateral: 1,
								borrowAsDebt: 0
							},
							chainLists: {
								borrowAsCollateral: [],
								borrowAsDebt: []
							},
							pageSize: 10
						}
					}
				])}
			/>
		)

		expect(renderedTokenSections).toEqual(['token-overview', 'token-risks', 'token-usage', 'token-borrow'])
		expect(renderedTokenSections).not.toContain('token-yields')
		expect(renderedTokenSections).not.toContain('token-unlocks')
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
				seoTitle: 'BTC Price, Market Cap, Supply & Trading Volume',
				seoDescription: 'Track BTC price, market cap, circulating supply, max supply, and trading volume.',
				canonicalUrl: '/token/BTC',
				sections: [
					{
						id: 'token-overview',
						overview: overviewFixture,
						geckoId: 'bitcoin'
					},
					{
						id: 'token-markets',
						tokenSymbol: 'BTC'
					},
					{
						id: 'token-usage',
						tokenSymbol: 'BTC'
					}
				]
			},
			revalidate: 123
		})
	})

	it('getStaticProps keeps the canonical URL metadata-defined for lowercase token params', async () => {
		await expect(getStaticProps({ params: { token: 'btc' } } as never)).resolves.toMatchObject({
			props: {
				seoTitle: 'BTC Price, Market Cap, Supply & Trading Volume',
				seoDescription: 'Track BTC price, market cap, circulating supply, max supply, and trading volume.',
				canonicalUrl: '/token/BTC',
				sections: [
					{
						id: 'token-overview',
						overview: overviewFixture,
						geckoId: 'bitcoin'
					},
					{
						id: 'token-markets',
						tokenSymbol: 'BTC'
					},
					{
						id: 'token-usage',
						tokenSymbol: 'BTC'
					}
				]
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

		expect(tokenPageSectionIds(result.props.sections)).toContain('token-liquidations')
	})

	it('getStaticProps skips the liquidations section when metadata has the token but no rows', async () => {
		state.liquidationsTokenSymbols = ['BTC']
		state.liquidationsTokenSymbolsSet = new Set(['BTC'])

		const result = await getStaticProps({ params: { token: 'btc' } } as never)

		expect('props' in result).toBe(true)
		if (!('props' in result)) throw new Error('expected props')

		expect(tokenPageSectionIds(result.props.sections)).not.toContain('token-liquidations')
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
				seoTitle: 'BTC Price, Market Cap, Supply & Trading Volume',
				seoDescription: 'Track BTC price, market cap, circulating supply, max supply, and trading volume.',
				canonicalUrl: '/token/BTC',
				sections: [
					{
						id: 'token-overview',
						overview: overviewFixture,
						geckoId: null
					},
					{
						id: 'token-markets',
						tokenSymbol: 'BTC'
					},
					{
						id: 'token-usage',
						tokenSymbol: 'BTC'
					}
				]
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
				seoTitle: 'Swing.xyz Price, Market Cap, Supply & Trading Volume',
				seoDescription: 'Track Swing.xyz price, market cap, circulating supply, max supply, and trading volume.',
				canonicalUrl: '/token/%24SWING',
				sections: [
					{
						id: 'token-overview',
						overview: overviewFixture,
						geckoId: 'swing-xyz'
					},
					{
						id: 'token-usage',
						tokenSymbol: '$SWING'
					}
				]
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
		const result = await getStaticProps({ params: { token: 'link' } } as never)

		expect('props' in result).toBe(true)
		if (!('props' in result)) throw new Error('expected props')

		const tokenRightsSection = findTokenPageSection(result.props.sections, 'token-rights-and-value-accrual')
		expect(result).toMatchObject({
			props: {
				seoTitle: 'LINK Price, Market Cap, Supply, Trading Volume & Token Rights',
				seoDescription:
					'Track LINK price, market cap, circulating supply, max supply, trading volume, and token rights.',
				canonicalUrl: '/token/LINK'
			},
			revalidate: 123
		})
		expect(tokenPageSectionIds(result.props.sections)).toEqual([
			'token-overview',
			'token-rights-and-value-accrual',
			'token-usage'
		])
		expect(tokenRightsSection?.tokenRightsData.overview).toEqual({
			protocolName: 'Chainlink',
			tokens: ['LINK'],
			tokenTypes: ['Governance'],
			description: 'desc',
			utility: null,
			lastUpdated: null
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

		const tokenRightsSection = findTokenPageSection(result.props.sections, 'token-rights-and-value-accrual')
		expect(tokenRightsSection?.tokenRightsData.overview).toEqual({
			protocolName: 'Backpack',
			tokens: ['BP', 'sBP'],
			tokenTypes: ['Utility'],
			description: 'desc',
			utility: null,
			lastUpdated: null
		})
		expect(tokenPageSectionIds(result.props.sections)).toEqual([
			'token-overview',
			'token-rights-and-value-accrual',
			'token-usage'
		])
		expect(fetchTokenRightsEntryByName).toHaveBeenCalledWith('Backpack')
		expect(fetchTokenRightsEntries).not.toHaveBeenCalled()
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

		expect(findTokenPageSection(result.props.sections, 'token-rights-and-value-accrual')).toBeUndefined()
		expect(tokenPageSectionIds(result.props.sections)).toEqual(['token-overview', 'token-usage'])
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

		expect(findTokenPageSection(result.props.sections, 'token-unlocks')?.resolvedUnlocksSlug).toBe('chainlink')
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

		expect(findTokenPageSection(result.props.sections, 'token-unlocks')?.resolvedUnlocksSlug).toBe('solana')
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

		const result = await getStaticProps({ params: { token: 'aave' } } as never)

		expect('props' in result).toBe(true)
		if (!('props' in result)) throw new Error('expected props')

		const incomeStatementSection = findTokenPageSection(result.props.sections, 'token-income-statement')
		expect(result).toMatchObject({
			props: {
				seoTitle: 'AAVE Price, Market Cap, Supply & Trading Volume',
				seoDescription: 'Track AAVE price, market cap, circulating supply, max supply, and trading volume.',
				canonicalUrl: '/token/AAVE'
			},
			revalidate: 123
		})
		expect(tokenPageSectionIds(result.props.sections)).toEqual([
			'token-overview',
			'token-income-statement',
			'token-usage'
		])
		expect(incomeStatementSection).toMatchObject({
			protocolName: 'Aave',
			incomeStatement: incomeStatementData,
			hasIncentives: true
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

		const yieldsSection = findTokenPageSection(result.props.sections, 'token-yields')
		expect(findTokenPageSection(result.props.sections, 'token-risks')).toBeUndefined()
		expect(yieldsSection).toMatchObject({
			hydration: {
				rows: state.initialYieldsRows,
				rowCount: state.initialYieldsRows.length
			}
		})
		expect(findTokenPageSection(result.props.sections, 'token-borrow')).toBeUndefined()
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

		const yieldsSection = findTokenPageSection(result.props.sections, 'token-yields')
		const borrowSection = findTokenPageSection(result.props.sections, 'token-borrow')
		expect(yieldsSection?.hydration.rows).toHaveLength(10)
		expect(yieldsSection?.hydration.rowCount).toBe(12)
		expect(yieldsSection?.hydration.pageSize).toBe(10)
		expect(borrowSection?.hydration.data.borrowAsCollateral).toHaveLength(10)
		expect(borrowSection?.hydration.data.borrowAsDebt).toHaveLength(10)
		expect(borrowSection?.hydration.pageSize).toBe(10)
		expect(borrowSection?.hydration.counts).toEqual({
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
		vi.mocked(getTokenYieldsRows).mockRejectedValueOnce(new Error('yields failed'))
		vi.mocked(getTokenBorrowRoutes).mockRejectedValueOnce(new Error('borrow routes failed'))
		vi.mocked(getTokenRiskData).mockRejectedValueOnce(new Error('risk failed'))

		const result = await getStaticProps({ params: { token: 'link' } } as never)

		expect('props' in result).toBe(true)
		if (!('props' in result)) throw new Error('expected props')

		expect(findTokenPageSection(result.props.sections, 'token-rights-and-value-accrual')).toBeUndefined()
		expect(findTokenPageSection(result.props.sections, 'token-income-statement')).toBeUndefined()
		expect(findTokenPageSection(result.props.sections, 'token-yields')).toBeUndefined()
		expect(findTokenPageSection(result.props.sections, 'token-borrow')).toBeUndefined()
		expect(findTokenPageSection(result.props.sections, 'token-risks')).toBeUndefined()
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

	it('rethrows dataset cache integrity errors from optional dataset sections', async () => {
		state.liquidationsTokenSymbolsSet = new Set(['BTC'])
		const integrityError = new DatasetCacheIntegrityError(
			'liquidations',
			'raw/all.json',
			new Error('corrupt liquidations index')
		)
		vi.mocked(hasTokenLiquidationsData).mockRejectedValueOnce(integrityError)

		await expect(getStaticProps({ params: { token: 'btc' } } as never)).rejects.toThrow('corrupt liquidations index')
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

		renderToStaticMarkup(<TokenPage {...withoutRisk.props} />)
		expect(renderedTokenSections).not.toContain('token-yields')
		expect(renderedTokenSections).not.toContain('token-borrow')
		expect(renderedTokenSections).not.toContain('token-risks')

		const riskRows: TokenRiskResponse['exposures']['rows'] = [
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
		]

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
				rows: riskRows,
				protocolSummaries: buildTokenRiskProtocolSummaries(riskRows),
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

		renderedTokenSections.length = 0
		renderToStaticMarkup(<TokenPage {...withRisk.props} />)
		expect(renderedTokenSections).not.toContain('token-yields')
		expect(renderedTokenSections).not.toContain('token-borrow')
		expect(renderedTokenSections).toContain('token-risks')
	})
})
