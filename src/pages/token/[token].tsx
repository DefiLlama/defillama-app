import type { GetStaticPropsContext, InferGetStaticPropsType } from 'next'
import type { ReactNode } from 'react'
import { SKIP_BUILD_STATIC_GENERATION } from '~/constants'
import { getProtocolIncomeStatement } from '~/containers/ProtocolOverview/queries'
import {
	buildInitialBorrowRoutesSnapshot,
	buildInitialYieldsSnapshot,
	downgradeTokenPageDataError,
	getCoinGeckoId,
	getTokenPageSections,
	getTokenRiskData
} from '~/containers/Token/queries'
import { TokenBorrowSection } from '~/containers/Token/TokenBorrowSection'
import { TokenIncomeStatementSection } from '~/containers/Token/TokenIncomeStatementSection'
import { TokenLiquidationsSection } from '~/containers/Token/TokenLiquidationsSection'
import { TokenMarketsSection } from '~/containers/Token/TokenMarketsSection'
import { getTokenOverviewData, TOKEN_OVERVIEW_DEFAULT_CHARTS } from '~/containers/Token/tokenOverview'
import { TokenOverviewSection } from '~/containers/Token/TokenOverviewSection'
import { TokenPageSectionNav } from '~/containers/Token/TokenPageSectionNav'
import { TokenRisksSection } from '~/containers/Token/TokenRisksSection'
import { getTokenRiskTimelineData } from '~/containers/Token/tokenRiskTimeline.server'
import { TokenRiskTimelineSection } from '~/containers/Token/TokenRiskTimelineSection'
import { resolveTokenUnlockSlug } from '~/containers/Token/tokenUnlocks'
import { TokenUnlocksSection } from '~/containers/Token/TokenUnlocksSection'
import { TokenUsageSection } from '~/containers/Token/TokenUsageSection'
import { TokenYieldsSection } from '~/containers/Token/TokenYieldsSection'
import type { TokenPageProps, TokenPageSection } from '~/containers/Token/types'
import { TokenRightsByProtocol } from '~/containers/TokenRights/TokenRightsByProtocol'
import { parseTokenRightsEntry } from '~/containers/TokenRights/utils'
import Layout from '~/layout'
import { slug } from '~/utils'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { normalizeLiquidationsTokenSymbol } from '~/utils/metadata/liquidations'
import type { ITokenListEntry } from '~/utils/metadata/types'
import { withPerformanceLogging } from '~/utils/perf'

type TokenRouteParams = {
	token: string
}

const INITIAL_TOKEN_PRERENDER_LIMIT = 30

type TokenPageSectionRendererMap = {
	[Section in TokenPageSection as Section['id']]: (props: { section: Section }) => ReactNode
}

export const getStaticProps = withPerformanceLogging<TokenPageProps, TokenRouteParams>(
	'token/[token]',
	async ({ params }: GetStaticPropsContext<TokenRouteParams>) => {
		const token = params?.token
		if (typeof token !== 'string') {
			return { notFound: true }
		}

		const metadataModule = await import('~/utils/metadata')
		const metadataCache = metadataModule.default
		const normalizedToken = slug(token)
		const record = metadataCache.tokenDirectory[normalizedToken]

		if (!record) {
			return {
				notFound: true,
				revalidate: maxAgeForNext([22])
			}
		}

		const geckoId = getCoinGeckoId(record.token_nk)
		const tokenEntry: ITokenListEntry | null = geckoId ? (metadataCache.tokenlist[geckoId] ?? null) : null
		const protocolMetadata = record.protocolId ? (metadataCache.protocolMetadata[record.protocolId] ?? null) : null
		const resolvedUnlocksSlug =
			resolveTokenUnlockSlug({
				record,
				protocolMetadata: metadataCache.protocolMetadata,
				chainMetadata: metadataCache.chainMetadata,
				emissionsProtocolsList: metadataCache.emissionsProtocolsList
			}) ?? null
		const llamaswapChains = geckoId ? (metadataCache.protocolLlamaswapDataset?.[geckoId] ?? null) : null
		const displayName = slug(record.symbol) === normalizedToken ? record.symbol : record.name
		const normalizedLiquidationsSymbol = normalizeLiquidationsTokenSymbol(record.symbol)
		const chainDefiLlamaId = record.chainId ? `chain#${record.chainId.toLowerCase()}` : null
		const protocolDefiLlamaId = record.protocolId ?? protocolMetadata?.name ?? null
		const [
			{ isDatasetCacheIntegrityError },
			{ hasTokenLiquidationsData },
			{ fetchLiquidityEntryByProtocolId },
			{ fetchTokenMarketsList },
			{ fetchRaisesByDefillamaId },
			{ getIndexedTokenRiskBorrowCapacity },
			{ fetchTokenRightsEntryByDefillamaId, fetchTokenRightsEntryByName },
			{ fetchTreasuryById },
			{ getTokenBorrowRoutes, getTokenYieldsRows, getYieldConfig }
		] = await Promise.all([
			import('~/server/datasetCache/core'),
			import('~/containers/LiquidationsV2/server/dataset'),
			import('~/containers/Token/server/dataset.liquidity'),
			import('~/containers/Token/server/dataset.markets'),
			import('~/containers/Raises/server/dataset'),
			import('~/containers/Token/server/dataset.risk'),
			import('~/containers/TokenRights/server/dataset'),
			import('~/containers/Treasuries/server/dataset'),
			import('~/containers/Yields/server/dataset')
		])
		const downgradeTokenPageError = <T,>(error: unknown, message: string, fallback: T): T =>
			downgradeTokenPageDataError(error, message, fallback, isDatasetCacheIntegrityError)
		const normalizedMarketsSymbol = record.symbol.toLowerCase()
		const marketsAvailablePromise = fetchTokenMarketsList()
			.then((tokenMarketsList) => {
				for (const tokenMarket of tokenMarketsList.tokens) {
					if (tokenMarket.symbol.toLowerCase() === normalizedMarketsSymbol) {
						return true
					}
				}
				return false
			})
			.catch((error) => downgradeTokenPageError(error, `Failed to load token markets list for ${record.symbol}`, false))
		let liquidationsPromise: Promise<boolean> = Promise.resolve(false)
		if (normalizedLiquidationsSymbol && metadataCache.liquidationsTokenSymbolsSet.has(normalizedLiquidationsSymbol)) {
			const liquidationsSymbol = normalizedLiquidationsSymbol
			liquidationsPromise = hasTokenLiquidationsData(liquidationsSymbol).catch((error) =>
				downgradeTokenPageError(error, `Failed to load token liquidations data for ${record.symbol}`, false)
			)
		}
		const overviewPromise = (async () => {
			const shouldFetchRaises = Boolean(chainDefiLlamaId || protocolDefiLlamaId)
			const shouldFetchTreasury = Boolean(!record.chainId && protocolDefiLlamaId)
			const shouldFetchLiquidity = Boolean(protocolMetadata?.liquidity && protocolDefiLlamaId)
			const [raises, treasury, yieldConfig, liquidityInfo] = await Promise.all([
				shouldFetchRaises ? fetchRaisesByDefillamaId(chainDefiLlamaId ?? protocolDefiLlamaId!) : Promise.resolve(null),
				// Treasury shards are keyed by the upstream `${defillamaId}-treasury` convention.
				shouldFetchTreasury ? fetchTreasuryById(`${protocolDefiLlamaId}-treasury`) : Promise.resolve(null),
				shouldFetchLiquidity ? getYieldConfig() : Promise.resolve(null),
				shouldFetchLiquidity ? fetchLiquidityEntryByProtocolId(protocolDefiLlamaId!) : Promise.resolve(null)
			])

			return getTokenOverviewData({
				record,
				displayName,
				geckoId,
				tokenEntry,
				protocolMetadata,
				cgExchangeIdentifiers: metadataCache.cgExchangeIdentifiers ?? [],
				llamaswapChains,
				emissionsSupplyMetrics: metadataCache.emissionsSupplyMetrics,
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

		const tokenRightsPromise = record.tokenRights
			? (async () => {
					try {
						const defillamaId = record.chainId || record.protocolId || null
						const rawEntry = defillamaId
							? await fetchTokenRightsEntryByDefillamaId(defillamaId)
							: await fetchTokenRightsEntryByName(record.name)
						return rawEntry ? parseTokenRightsEntry(rawEntry) : null
					} catch (error) {
						return downgradeTokenPageError(
							error,
							`Failed to load token rights data for ${record.chainId || record.protocolId}`,
							null
						)
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
					return getTokenRiskData({
						geckoId,
						tokenSymbol: record.symbol,
						protocolLlamaswapDataset: metadataCache.protocolLlamaswapDataset,
						displayLookups: {
							protocolDisplayNames: metadataCache.protocolDisplayNames,
							chainDisplayNames: metadataCache.chainDisplayNames
						},
						borrowCapacitySnapshot: await getIndexedTokenRiskBorrowCapacity()
					})
				})().catch((error) => {
					return downgradeTokenPageError(error, `Failed to load token risk data for ${geckoId}`, null)
				})
			: Promise.resolve(null)

		const yieldsRowsPromise = record.is_yields
			? getTokenYieldsRows(record.symbol).catch((error) =>
					downgradeTokenPageError(error, `Failed to load token yields data for ${record.symbol}`, [])
				)
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
			hasLiquidations,
			tokenRiskData,
			tokenRiskTimelineData,
			hasMarkets
		] = await Promise.all([
			overviewPromise,
			tokenRightsPromise,
			incomeStatementPromise,
			yieldsRowsPromise,
			getTokenBorrowRoutes(record.symbol).catch((error) =>
				downgradeTokenPageError(error, `Failed to load token borrow routes data for ${record.symbol}`, null)
			),
			liquidationsPromise,
			tokenRiskPromise,
			tokenRiskTimelinePromise,
			marketsAvailablePromise
		])

		const incomeStatement =
			resolvedIncomeStatementData && protocolMetadata?.displayName
				? {
						data: resolvedIncomeStatementData,
						protocolName: protocolMetadata.displayName,
						hasIncentives: Boolean(protocolMetadata.incentives)
					}
				: null
		const yieldsSnapshot = buildInitialYieldsSnapshot(yieldsRows)
		const borrowRoutesSnapshot = buildInitialBorrowRoutesSnapshot(tokenBorrowRoutesData)
		const sections = getTokenPageSections({
			record,
			geckoId,
			tokenRightsData,
			incomeStatement,
			tokenRiskData,
			tokenRiskTimelineData,
			hasLiquidations,
			hasMarkets,
			resolvedUnlocksSlug,
			yieldsSnapshot,
			borrowRoutesSnapshot,
			overview
		})

		const seoTitle = record.tokenRights
			? `${displayName} Price, Market Cap, Supply, Trading Volume & Token Rights`
			: `${displayName} Price, Market Cap, Supply & Trading Volume`
		const seoDescription = record.tokenRights
			? `Track ${displayName} price, market cap, circulating supply, max supply, trading volume, and token rights.`
			: `Track ${displayName} price, market cap, circulating supply, max supply, and trading volume.`

		return {
			props: {
				seoTitle,
				seoDescription,
				canonicalUrl: record.route ?? `/token/${encodeURIComponent(record.symbol)}`,
				sections
			},
			revalidate: maxAgeForNext([22])
		}
	}
)

export const getStaticPaths = async () => {
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

	return {
		paths: rankedRecords.map((record) => record.route),
		fallback: 'blocking'
	}
}

const TOKEN_SECTION_RENDERERS = {
	'token-overview': ({ section }) => (
		<TokenOverviewSection overview={section.overview} geckoId={section.geckoId} logo={section.logo} />
	),
	'token-markets': ({ section }) => <TokenMarketsSection tokenSymbol={section.tokenSymbol} />,
	'token-income-statement': ({ section }) => (
		<TokenIncomeStatementSection
			protocolName={section.protocolName}
			incomeStatement={section.incomeStatement}
			hasIncentives={section.hasIncentives}
		/>
	),
	'token-risks': ({ section }) => <TokenRisksSection tokenSymbol={section.tokenSymbol} riskData={section.riskData} />,
	'token-risk-timeline': ({ section }) => (
		<TokenRiskTimelineSection tokenSymbol={section.tokenSymbol} timelineData={section.timelineData} />
	),
	'token-rights-and-value-accrual': ({ section }) => (
		<TokenRightsByProtocol
			name={section.name}
			symbol={section.symbol}
			tokenRightsData={section.tokenRightsData}
			raises={null}
			showHeader
			headerVariant="embedded"
		/>
	),
	'token-usage': ({ section }) => <TokenUsageSection tokenSymbol={section.tokenSymbol} />,
	'token-liquidations': ({ section }) => <TokenLiquidationsSection tokenSymbol={section.tokenSymbol} />,
	'token-unlocks': ({ section }) => <TokenUnlocksSection resolvedUnlocksSlug={section.resolvedUnlocksSlug} />,
	'token-yields': ({ section }) => (
		<TokenYieldsSection tokenSymbol={section.tokenSymbol} hydration={section.hydration} />
	),
	'token-borrow': ({ section }) => (
		<TokenBorrowSection tokenSymbol={section.tokenSymbol} hydration={section.hydration} />
	)
} satisfies TokenPageSectionRendererMap

function TokenPageSectionRenderer<Section extends TokenPageSection>({ section }: { section: Section }) {
	const SectionRenderer = TOKEN_SECTION_RENDERERS[section.id] as (props: { section: Section }) => ReactNode
	return <SectionRenderer section={section} />
}

export default function TokenPage(props: InferGetStaticPropsType<typeof getStaticProps>) {
	return (
		<Layout title={props.seoTitle} description={props.seoDescription} canonicalUrl={props.canonicalUrl}>
			<div className="flex flex-col gap-2">
				<TokenPageSectionNav
					sections={props.sections.map((section) => ({
						id: section.id,
						label: section.label
					}))}
				/>
				{props.sections.map((section) => (
					<TokenPageSectionRenderer key={`token-page-${section.id}`} section={section} />
				))}
			</div>
		</Layout>
	)
}
