import type { GetStaticPropsContext, InferGetStaticPropsType } from 'next'
import { Fragment, type ReactNode } from 'react'
import { SKIP_BUILD_STATIC_GENERATION } from '~/constants'
import { getProtocolIncomeStatement } from '~/containers/ProtocolOverview/queries'
import { getTokenRiskData } from '~/containers/Token/queries'
import { DEFAULT_TABLE_PAGE_SIZE } from '~/containers/Token/tableUtils'
import { getTokenBorrowRoutesDataFromNetwork } from '~/containers/Token/tokenBorrowRoutes.server'
import type { TokenBorrowRoutesResponse } from '~/containers/Token/tokenBorrowRoutes.types'
import { TokenBorrowSection } from '~/containers/Token/TokenBorrowSection'
import { TokenIncomeStatementSection } from '~/containers/Token/TokenIncomeStatementSection'
import { TokenLiquidationsSection } from '~/containers/Token/TokenLiquidationsSection'
import { getTokenOverviewData, TOKEN_OVERVIEW_DEFAULT_CHARTS } from '~/containers/Token/tokenOverview'
import { TokenOverviewSection } from '~/containers/Token/TokenOverviewSection'
import { TokenPageSectionNav } from '~/containers/Token/TokenPageSectionNav'
import type { TokenRiskResponse } from '~/containers/Token/tokenRisk.types'
import { TokenRisksSection } from '~/containers/Token/TokenRisksSection'
import { getTokenRiskTimelineData } from '~/containers/Token/tokenRiskTimeline.server'
import type { RiskTimelineResponse } from '~/containers/Token/tokenRiskTimeline.types'
import { TokenRiskTimelineSection } from '~/containers/Token/TokenRiskTimelineSection'
import { resolveTokenUnlockSlug } from '~/containers/Token/tokenUnlocks'
import { TokenUnlocksSection } from '~/containers/Token/TokenUnlocksSection'
import { TokenUsageSection } from '~/containers/Token/TokenUsageSection'
import { getTokenYieldsRowsFromNetwork } from '~/containers/Token/tokenYields.server'
import { TokenYieldsSection } from '~/containers/Token/TokenYieldsSection'
import type { ITokenRightsData } from '~/containers/TokenRights/api.types'
import { TokenRightsByProtocol } from '~/containers/TokenRights/TokenRightsByProtocol'
import { parseTokenRightsEntry } from '~/containers/TokenRights/utils'
import type { IYieldTableRow } from '~/containers/Yields/Tables/types'
import { extractPoolTokens } from '~/containers/Yields/utils'
import Layout from '~/layout'
import { isDatasetCacheEnabled } from '~/server/datasetCache/config'
import { slug } from '~/utils'
import { normalizeLiquidationsTokenSymbol } from '~/utils/metadata/liquidations'
import type { ITokenListEntry } from '~/utils/metadata/types'
import { withPerformanceLogging } from '~/utils/perf'
import type { TokenDirectoryRecord } from '~/utils/tokenDirectory'

type TokenRouteParams = {
	token: string
}

type TokenPageSectionId =
	| 'token-overview'
	| 'token-income-statement'
	| 'token-risks'
	| 'token-risk-timeline'
	| 'token-rights-and-value-accrual'
	| 'token-usage'
	| 'token-liquidations'
	| 'token-unlocks'
	| 'token-yields'
	| 'token-borrow'

type TokenPageProps = {
	record: TokenDirectoryRecord
	displayName: string
	tokenRightsData: ITokenRightsData | null
	incomeStatementData: Awaited<ReturnType<typeof getProtocolIncomeStatement>>
	incomeStatementProtocolName: string | null
	incomeStatementHasIncentives: boolean
	geckoId: string | null
	tokenRiskData: TokenRiskResponse | null
	tokenRiskTimelineData: RiskTimelineResponse | null
	initialYieldsRows: IYieldTableRow[]
	initialYieldsRowCount: number
	initialYieldsChainList: string[]
	initialYieldsTokensList: string[]
	initialTokenBorrowRoutesData: TokenBorrowRoutesResponse | null
	initialTokenBorrowRoutesCounts: {
		borrowAsCollateral: number
		borrowAsDebt: number
	} | null
	initialTokenBorrowRoutesChainLists: {
		borrowAsCollateral: string[]
		borrowAsDebt: string[]
	} | null
	hasLiquidations: boolean
	resolvedUnlocksSlug?: string
	overview: Awaited<ReturnType<typeof getTokenOverviewData>>
	seoTitle: string
	seoDescription: string
	canonicalUrl: string
	visibleSections: TokenPageSectionId[]
}

const INITIAL_TOKEN_PRERENDER_LIMIT = 30
const TOKEN_PAGE_REVALIDATE_SECONDS = 10 * 60

type TokenPageSection = {
	label: string
	render: (props: TokenPageProps) => ReactNode
}

const TOKEN_SECTIONS = {
	'token-overview': {
		label: 'Overview',
		render: ({ overview, geckoId, record }) => (
			<TokenOverviewSection overview={overview} geckoId={geckoId} logo={record.logo} />
		)
	},
	'token-income-statement': {
		label: 'Income Statement',
		render: ({ incomeStatementProtocolName, incomeStatementData, incomeStatementHasIncentives }) => (
			<TokenIncomeStatementSection
				protocolName={incomeStatementProtocolName!}
				incomeStatement={incomeStatementData}
				hasIncentives={incomeStatementHasIncentives}
			/>
		)
	},
	'token-risks': {
		label: 'Risks',
		render: ({ record, tokenRiskData }) => <TokenRisksSection tokenSymbol={record.symbol} riskData={tokenRiskData!} />
	},
	'token-risk-timeline': {
		label: 'Risk Timeline',
		render: ({ record, tokenRiskTimelineData }) => (
			<TokenRiskTimelineSection tokenSymbol={record.symbol} timelineData={tokenRiskTimelineData!} />
		)
	},
	'token-rights-and-value-accrual': {
		label: 'Token Rights',
		render: ({ record, tokenRightsData }) => (
			<TokenRightsByProtocol
				name={record.name}
				symbol={record.symbol}
				tokenRightsData={tokenRightsData!}
				raises={null}
				showHeader
				headerVariant="embedded"
			/>
		)
	},
	'token-usage': {
		label: 'Token Usage',
		render: ({ record }) => <TokenUsageSection tokenSymbol={record.symbol} />
	},
	'token-liquidations': {
		label: 'Liquidations',
		render: ({ record }) => <TokenLiquidationsSection tokenSymbol={record.symbol} />
	},
	'token-unlocks': {
		label: 'Unlocks',
		render: ({ resolvedUnlocksSlug }) => <TokenUnlocksSection resolvedUnlocksSlug={resolvedUnlocksSlug} />
	},
	'token-yields': {
		label: 'Yields',
		render: ({ record, initialYieldsRows, initialYieldsRowCount, initialYieldsChainList, initialYieldsTokensList }) => (
			<TokenYieldsSection
				tokenSymbol={record.symbol}
				initialData={initialYieldsRows}
				initialRowCount={initialYieldsRowCount}
				initialChainList={initialYieldsChainList}
				initialTokensList={initialYieldsTokensList}
			/>
		)
	},
	'token-borrow': {
		label: 'Borrow',
		render: ({
			record,
			initialTokenBorrowRoutesData,
			initialTokenBorrowRoutesCounts,
			initialTokenBorrowRoutesChainLists
		}) => (
			<TokenBorrowSection
				tokenSymbol={record.symbol}
				initialData={initialTokenBorrowRoutesData ?? undefined}
				initialCounts={initialTokenBorrowRoutesCounts}
				initialChains={initialTokenBorrowRoutesChainLists}
			/>
		)
	}
} satisfies Record<TokenPageSectionId, TokenPageSection>

function getCoinGeckoId(tokenNk: string | undefined): string | null {
	if (!tokenNk?.startsWith('coingecko:')) return null
	return tokenNk.slice('coingecko:'.length) || null
}

function getBorrowRouteChainList(rows: TokenBorrowRoutesResponse['borrowAsCollateral']): string[] {
	return [
		...new Set(
			rows.map((row) => row.chains[0]).filter((chain): chain is string => typeof chain === 'string' && chain.length > 0)
		)
	].sort()
}

function getVisibleTokenSections({
	record,
	incomeStatementData,
	incomeStatementProtocolName,
	tokenRiskData,
	tokenRiskTimelineData,
	tokenRightsData,
	hasLiquidations,
	resolvedUnlocksSlug,
	initialYieldsRowCount,
	initialTokenBorrowRoutesCounts
}: Pick<
	TokenPageProps,
	| 'record'
	| 'incomeStatementData'
	| 'incomeStatementProtocolName'
	| 'tokenRiskData'
	| 'tokenRiskTimelineData'
	| 'tokenRightsData'
	| 'hasLiquidations'
	| 'resolvedUnlocksSlug'
	| 'initialYieldsRowCount'
	| 'initialTokenBorrowRoutesCounts'
>): TokenPageSectionId[] {
	const shouldRenderYieldsSection = record.is_yields && initialYieldsRowCount > 0
	const shouldRenderBorrowSection =
		(initialTokenBorrowRoutesCounts?.borrowAsCollateral ?? 0) > 0 ||
		(initialTokenBorrowRoutesCounts?.borrowAsDebt ?? 0) > 0
	const visibleSections: TokenPageSectionId[] = ['token-overview']

	if (incomeStatementData && incomeStatementProtocolName) {
		visibleSections.push('token-income-statement')
	}
	if (tokenRiskData) {
		visibleSections.push('token-risks')
	}
	if (tokenRiskTimelineData) {
		visibleSections.push('token-risk-timeline')
	}
	if (tokenRightsData) {
		visibleSections.push('token-rights-and-value-accrual')
	}

	visibleSections.push('token-usage')

	if (hasLiquidations) {
		visibleSections.push('token-liquidations')
	}
	if (resolvedUnlocksSlug) {
		visibleSections.push('token-unlocks')
	}
	if (shouldRenderYieldsSection) {
		visibleSections.push('token-yields')
	}
	if (shouldRenderBorrowSection) {
		visibleSections.push('token-borrow')
	}

	return visibleSections
}

export const getStaticProps = withPerformanceLogging<TokenPageProps, TokenRouteParams>(
	'token/[token]',
	async ({ params }: GetStaticPropsContext<TokenRouteParams>) => {
		const token = params?.token
		if (typeof token !== 'string') {
			return { notFound: true }
		}

		const metadataModule = await import('~/utils/metadata')
		await metadataModule.refreshMetadataIfStale()
		const metadataCache = metadataModule.default
		const normalizedToken = slug(token)
		const record = metadataCache.tokenDirectory[normalizedToken]

		if (!record) {
			return {
				notFound: true,
				revalidate: TOKEN_PAGE_REVALIDATE_SECONDS
			}
		}

		const geckoId = getCoinGeckoId(record.token_nk)
		const tokenEntry: ITokenListEntry | null = geckoId ? (metadataCache.tokenlist[geckoId] ?? null) : null
		const protocolMetadata = record.protocolId ? (metadataCache.protocolMetadata[record.protocolId] ?? null) : null
		const resolvedUnlocksSlug = resolveTokenUnlockSlug({
			record,
			protocolMetadata: metadataCache.protocolMetadata,
			chainMetadata: metadataCache.chainMetadata,
			emissionsProtocolsList: metadataCache.emissionsProtocolsList
		})
		const llamaswapChains = geckoId ? (metadataCache.protocolLlamaswapDataset?.[geckoId] ?? null) : null
		const displayName = slug(record.symbol) === normalizedToken ? record.symbol : record.name
		const hasLiquidations = metadataCache.liquidationsTokenSymbolsSet.has(
			normalizeLiquidationsTokenSymbol(record.symbol) ?? ''
		)
		const shouldUseDatasetCache = isDatasetCacheEnabled()
		const chainDefiLlamaId = record.chainId ? `chain#${record.chainId.toLowerCase()}` : null
		const protocolDefiLlamaId = record.protocolId ?? protocolMetadata?.name ?? null
		let incomeStatementData = null
		let incomeStatementProtocolName: string | null = null
		let incomeStatementHasIncentives = false
		const overviewPromise = (async () => {
			if (!shouldUseDatasetCache) {
				return getTokenOverviewData({
					record,
					displayName,
					geckoId,
					tokenEntry,
					protocolMetadata,
					cgExchangeIdentifiers: metadataCache.cgExchangeIdentifiers ?? [],
					llamaswapChains,
					source: { kind: 'network' },
					prefetchedCharts: TOKEN_OVERVIEW_DEFAULT_CHARTS
				})
			}

			const shouldFetchRaises = Boolean(chainDefiLlamaId || protocolDefiLlamaId)
			const shouldFetchTreasury = Boolean(!record.chainId && protocolDefiLlamaId)
			const shouldFetchLiquidity = Boolean(protocolMetadata?.liquidity && protocolDefiLlamaId)
			const [raisesCacheModule, treasuriesCacheModule, yieldsCacheModule, liquidityCacheModule] = await Promise.all([
				shouldFetchRaises ? import('~/server/datasetCache/raises') : Promise.resolve(null),
				shouldFetchTreasury ? import('~/server/datasetCache/treasuries') : Promise.resolve(null),
				shouldFetchLiquidity ? import('~/server/datasetCache/yields') : Promise.resolve(null),
				shouldFetchLiquidity ? import('~/server/datasetCache/liquidity') : Promise.resolve(null)
			])
			const [raises, treasury, yieldConfig, liquidityInfo] = await Promise.all([
				raisesCacheModule && (chainDefiLlamaId || protocolDefiLlamaId)
					? raisesCacheModule.fetchRaisesByDefillamaIdFromCache(chainDefiLlamaId ?? protocolDefiLlamaId!)
					: Promise.resolve(null),
				// Treasury shards are keyed by the upstream `${defillamaId}-treasury` convention.
				treasuriesCacheModule && protocolDefiLlamaId
					? treasuriesCacheModule.fetchTreasuryByIdFromCache(`${protocolDefiLlamaId}-treasury`)
					: Promise.resolve(null),
				yieldsCacheModule ? yieldsCacheModule.getYieldConfigFromCache() : Promise.resolve(null),
				liquidityCacheModule && protocolDefiLlamaId
					? liquidityCacheModule.fetchLiquidityEntryByProtocolIdFromCache(protocolDefiLlamaId)
					: Promise.resolve(null)
			])

			return getTokenOverviewData({
				record,
				displayName,
				geckoId,
				tokenEntry,
				protocolMetadata,
				cgExchangeIdentifiers: metadataCache.cgExchangeIdentifiers ?? [],
				llamaswapChains,
				source: {
					kind: 'prefetched',
					raises,
					treasury,
					yieldConfig,
					liquidityInfo
				},
				prefetchedCharts: TOKEN_OVERVIEW_DEFAULT_CHARTS
			})
		})()

		const tokenRightsPromise =
			record.tokenRights && (record.chainId || record.protocolId)
				? (async () => {
						try {
							if (shouldUseDatasetCache) {
								const { fetchTokenRightsEntryFromCache } = await import('~/server/datasetCache/tokenRights')
								const rawEntry = await fetchTokenRightsEntryFromCache(record.chainId || record.protocolId || '')
								return rawEntry ? parseTokenRightsEntry(rawEntry) : null
							}

							const { fetchTokenRightsEntryByDefillamaId } = await import('~/containers/TokenRights/api')
							const rawEntry = await fetchTokenRightsEntryByDefillamaId(record.chainId || record.protocolId || '')
							return rawEntry ? parseTokenRightsEntry(rawEntry) : null
						} catch (error) {
							console.error(`Failed to load token rights data for ${record.chainId || record.protocolId}`, error)
							return null
						}
					})()
				: Promise.resolve(null)

		const incomeStatementPromise = protocolMetadata
			? getProtocolIncomeStatement({ metadata: protocolMetadata }).catch((error) => {
					console.error(
						`Failed to load income statement data for ${protocolMetadata.displayName ?? protocolMetadata.name ?? record.name}`,
						error
					)
					return null
				})
			: Promise.resolve(null)

		const tokenRiskPromise = geckoId
			? (async () => {
					const borrowCapacitySnapshot = shouldUseDatasetCache
						? await (async () => {
								const { getIndexedTokenRiskBorrowCapacityFromCache } = await import('~/server/datasetCache/risk')
								return getIndexedTokenRiskBorrowCapacityFromCache()
							})()
						: undefined

					return getTokenRiskData({
						geckoId,
						tokenSymbol: record.symbol,
						protocolLlamaswapDataset: metadataCache.protocolLlamaswapDataset,
						displayLookups: {
							protocolDisplayNames: metadataCache.protocolDisplayNames,
							chainDisplayNames: metadataCache.chainDisplayNames
						},
						borrowCapacitySnapshot
					})
				})().catch((error) => {
					console.error(`Failed to load token risk data for ${geckoId}`, error)
					return null
				})
			: Promise.resolve(null)

		const yieldsRowsPromise = record.is_yields
			? (shouldUseDatasetCache
					? (async () => {
							const { getTokenYieldsRowsFromCache } = await import('~/server/datasetCache/yields')
							return getTokenYieldsRowsFromCache(record.symbol)
						})()
					: getTokenYieldsRowsFromNetwork(record.symbol)
				).catch((error) => {
					console.error(`Failed to load token yields data for ${record.symbol}`, error)
					return []
				})
			: Promise.resolve([])

		const tokenRiskTimelinePromise = record.symbol
			? getTokenRiskTimelineData(record.symbol).catch((error) => {
					console.error(`Failed to load token risk timeline data for ${record.symbol}`, error)
					return null
				})
			: Promise.resolve(null)

		const [
			overview,
			tokenRightsData,
			resolvedIncomeStatementData,
			yieldsRows,
			tokenBorrowRoutesData,
			riskData,
			riskTimelineData
		] = await Promise.all([
			overviewPromise,
			tokenRightsPromise,
			incomeStatementPromise,
			yieldsRowsPromise,
			(shouldUseDatasetCache
				? (async () => {
						const { getTokenBorrowRoutesFromCache } = await import('~/server/datasetCache/yields')
						return getTokenBorrowRoutesFromCache(record.symbol)
					})()
				: getTokenBorrowRoutesDataFromNetwork(record.symbol)
			).catch((error) => {
				console.error(`Failed to load token borrow routes data for ${record.symbol}`, error)
				return null
			}),
			tokenRiskPromise,
			tokenRiskTimelinePromise
		])

		if (resolvedIncomeStatementData) {
			incomeStatementData = resolvedIncomeStatementData
			incomeStatementProtocolName = protocolMetadata?.displayName ?? null
			incomeStatementHasIncentives = Boolean(protocolMetadata?.incentives)
		}

		const initialYieldsRowCount = yieldsRows.length
		const initialYieldsRows: IYieldTableRow[] = yieldsRows.slice(0, DEFAULT_TABLE_PAGE_SIZE)
		const initialYieldsChainList = [
			...new Set(yieldsRows.map((row) => row.chains[0]).filter((chain): chain is string => Boolean(chain)))
		].sort()
		const initialYieldsTokensList = [
			...new Set(yieldsRows.flatMap((row) => extractPoolTokens(row.pool)).map((poolToken) => poolToken.toUpperCase()))
		].sort()
		const initialTokenBorrowRoutesCounts: TokenPageProps['initialTokenBorrowRoutesCounts'] = tokenBorrowRoutesData
			? {
					borrowAsCollateral: tokenBorrowRoutesData.borrowAsCollateral.length,
					borrowAsDebt: tokenBorrowRoutesData.borrowAsDebt.length
				}
			: null
		const initialTokenBorrowRoutesChainLists: TokenPageProps['initialTokenBorrowRoutesChainLists'] =
			tokenBorrowRoutesData
				? {
						borrowAsCollateral: getBorrowRouteChainList(tokenBorrowRoutesData.borrowAsCollateral),
						borrowAsDebt: getBorrowRouteChainList(tokenBorrowRoutesData.borrowAsDebt)
					}
				: null
		const initialTokenBorrowRoutesData: TokenBorrowRoutesResponse | null = tokenBorrowRoutesData
			? {
					borrowAsCollateral: tokenBorrowRoutesData.borrowAsCollateral.slice(0, DEFAULT_TABLE_PAGE_SIZE),
					borrowAsDebt: tokenBorrowRoutesData.borrowAsDebt.slice(0, DEFAULT_TABLE_PAGE_SIZE)
				}
			: null
		const tokenRiskData: TokenRiskResponse | null = riskData
		const tokenRiskTimelineData: RiskTimelineResponse | null = riskTimelineData
		const visibleSections = getVisibleTokenSections({
			record,
			incomeStatementData,
			incomeStatementProtocolName,
			tokenRiskData,
			tokenRiskTimelineData,
			tokenRightsData,
			hasLiquidations,
			resolvedUnlocksSlug,
			initialYieldsRowCount,
			initialTokenBorrowRoutesCounts
		})

		const seoTitle = record.tokenRights
			? `${displayName} Price, Market Cap, Supply & Token Rights - DefiLlama`
			: `${displayName} Price, Market Cap & Supply - DefiLlama`
		const seoDescription = record.tokenRights
			? `Track ${displayName} price, market cap, circulating supply, max supply, 24h trading volume, and token rights on DefiLlama.`
			: `Track ${displayName} price, market cap, circulating supply, max supply, and 24h trading volume on DefiLlama.`

		return {
			props: {
				record,
				displayName,
				tokenRightsData,
				incomeStatementData,
				incomeStatementProtocolName,
				incomeStatementHasIncentives,
				geckoId,
				tokenRiskData,
				tokenRiskTimelineData,
				initialYieldsRows,
				initialYieldsRowCount,
				initialYieldsChainList,
				initialYieldsTokensList,
				initialTokenBorrowRoutesData,
				initialTokenBorrowRoutesCounts,
				initialTokenBorrowRoutesChainLists,
				hasLiquidations,
				...(resolvedUnlocksSlug ? { resolvedUnlocksSlug } : {}),
				overview,
				seoTitle,
				seoDescription,
				canonicalUrl: record.route ?? `/token/${encodeURIComponent(record.symbol)}`,
				visibleSections
			},
			revalidate: TOKEN_PAGE_REVALIDATE_SECONDS
		}
	}
)

export const getStaticPaths = async () => {
	// When this is true (in preview environments) don't
	// prerender any static pages
	// (faster builds, but slower initial page load)
	if (SKIP_BUILD_STATIC_GENERATION) {
		return {
			paths: [],
			fallback: 'blocking'
		}
	}

	const metadataModule = await import('~/utils/metadata')

	const tokenDirectory = metadataModule.default.tokenDirectory

	const rankedRecords = []

	for (const key in tokenDirectory) {
		const record = tokenDirectory[key]
		if (record.mcap_rank == null || record.mcap_rank < 1 || record.mcap_rank > INITIAL_TOKEN_PRERENDER_LIMIT) {
			continue
		}

		rankedRecords.push(record)
	}

	rankedRecords.sort((a, b) => (a.mcap_rank ?? Number.POSITIVE_INFINITY) - (b.mcap_rank ?? Number.POSITIVE_INFINITY))

	const paths = rankedRecords.map((record) => record.route)

	return { paths, fallback: 'blocking' }
}

export default function TokenPage(props: InferGetStaticPropsType<typeof getStaticProps>) {
	return (
		<Layout title={props.seoTitle} description={props.seoDescription} canonicalUrl={props.canonicalUrl}>
			<div className="flex flex-col gap-2">
				<TokenPageSectionNav
					sections={props.visibleSections.map((sectionId) => ({
						id: sectionId,
						label: TOKEN_SECTIONS[sectionId].label
					}))}
				/>
				{props.visibleSections.map((sectionId) => (
					<Fragment key={`token-page-${sectionId}`}>{TOKEN_SECTIONS[sectionId].render(props)}</Fragment>
				))}
			</div>
		</Layout>
	)
}
