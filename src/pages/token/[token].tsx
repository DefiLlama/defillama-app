import type { GetStaticPropsContext, InferGetStaticPropsType } from 'next'
import { cloneElement, type ReactElement } from 'react'
import { SKIP_BUILD_STATIC_GENERATION } from '~/constants'
import { getProtocolIncomeStatement } from '~/containers/ProtocolOverview/queries'
import { getTokenRiskData } from '~/containers/Token/queries'
import { getTokenBorrowRoutesData } from '~/containers/Token/tokenBorrowRoutes.server'
import type { TokenBorrowRoutesResponse } from '~/containers/Token/tokenBorrowRoutes.types'
import { TokenBorrowSection } from '~/containers/Token/TokenBorrowSection'
import { TokenIncomeStatementSection } from '~/containers/Token/TokenIncomeStatementSection'
import { TokenLiquidationsSection } from '~/containers/Token/TokenLiquidationsSection'
import { getTokenOverviewData, TOKEN_OVERVIEW_DEFAULT_CHARTS } from '~/containers/Token/tokenOverview'
import { TokenOverviewSection } from '~/containers/Token/TokenOverviewSection'
import { TokenPageSectionNav } from '~/containers/Token/TokenPageSectionNav'
import type { TokenRiskResponse } from '~/containers/Token/tokenRisk.types'
import { TokenRisksSection } from '~/containers/Token/TokenRisksSection'
import { resolveTokenUnlockSlug } from '~/containers/Token/tokenUnlocks'
import { TokenUnlocksSection } from '~/containers/Token/TokenUnlocksSection'
import { TokenUsageSection } from '~/containers/Token/TokenUsageSection'
import { getTokenYieldsRows } from '~/containers/Token/tokenYields.server'
import { TokenYieldsSection } from '~/containers/Token/TokenYieldsSection'
import { fetchTokenRightsData } from '~/containers/TokenRights/api'
import type { ITokenRightsData } from '~/containers/TokenRights/api.types'
import { TokenRightsByProtocol } from '~/containers/TokenRights/TokenRightsByProtocol'
import { findProtocolEntry, parseTokenRightsEntry } from '~/containers/TokenRights/utils'
import type { IYieldTableRow } from '~/containers/Yields/Tables/types'
import Layout from '~/layout'
import { slug } from '~/utils'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { normalizeLiquidationsTokenSymbol } from '~/utils/metadata/liquidations'
import type { ITokenListEntry } from '~/utils/metadata/types'
import { withPerformanceLogging } from '~/utils/perf'

type TokenRouteParams = {
	token: string
}

type TokenPageSection = {
	id: string
	label: string
	element: ReactElement
}

const INITIAL_TOKEN_PRERENDER_LIMIT = 30

function getCoinGeckoId(tokenNk: string | undefined): string | null {
	if (!tokenNk?.startsWith('coingecko:')) return null
	return tokenNk.slice('coingecko:'.length) || null
}

export const getStaticProps = withPerformanceLogging(
	'token/[token]',
	async ({ params }: GetStaticPropsContext<TokenRouteParams>) => {
		const token = params?.token
		if (typeof token !== 'string') {
			return { notFound: true }
		}

		const normalizedToken = slug(token)
		const metadataModule = await import('~/utils/metadata')
		await metadataModule.refreshMetadataIfStale()
		const metadataCache = metadataModule.default
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
		let tokenRightsData: ITokenRightsData | null = null
		let incomeStatementData = null
		let incomeStatementProtocolName: string | null = null
		let incomeStatementHasIncentives = false
		let tokenRiskData: TokenRiskResponse | null = null
		let initialYieldsRows: IYieldTableRow[] = []
		let initialTokenBorrowRoutesData: TokenBorrowRoutesResponse | null = null
		const overview = await getTokenOverviewData({
			record,
			displayName,
			geckoId,
			tokenEntry,
			protocolMetadata,
			cgExchangeIdentifiers: metadataCache.cgExchangeIdentifiers ?? [],
			llamaswapChains,
			prefetchedCharts: TOKEN_OVERVIEW_DEFAULT_CHARTS
		})

		if (record.tokenRights && (record.chainId || record.protocolId)) {
			tokenRightsData = await (async () => {
				try {
					const tokenRightsEntries = await fetchTokenRightsData()
					const rawEntry = findProtocolEntry(tokenRightsEntries, record.chainId || record.protocolId)
					return rawEntry ? parseTokenRightsEntry(rawEntry) : null
				} catch (error) {
					console.error(`Failed to load token rights data for ${record.chainId || record.protocolId}`, error)
					return null
				}
			})()
		}

		if (protocolMetadata) {
			incomeStatementData = await getProtocolIncomeStatement({ metadata: protocolMetadata }).catch((error) => {
				console.error(
					`Failed to load income statement data for ${protocolMetadata.displayName ?? protocolMetadata.name ?? record.name}`,
					error
				)
				return null
			})
			if (incomeStatementData) {
				incomeStatementProtocolName = protocolMetadata.displayName
				incomeStatementHasIncentives = Boolean(protocolMetadata.incentives)
			}
		}

		const tokenRiskPromise = geckoId
			? getTokenRiskData({
					geckoId,
					tokenSymbol: record.symbol,
					protocolLlamaswapDataset: metadataCache.protocolLlamaswapDataset,
					displayLookups: {
						protocolDisplayNames: metadataCache.protocolDisplayNames,
						chainDisplayNames: metadataCache.chainDisplayNames
					}
				}).catch((error) => {
					console.error(`Failed to load token risk data for ${geckoId}`, error)
					return null
				})
			: Promise.resolve(null)

		const yieldsRowsPromise = record.is_yields
			? getTokenYieldsRows(record.symbol).catch((error) => {
					console.error(`Failed to load token yields data for ${record.symbol}`, error)
					return []
				})
			: Promise.resolve([])

		const [yieldsRows, tokenBorrowRoutesData, riskData] = await Promise.all([
			yieldsRowsPromise,
			getTokenBorrowRoutesData(record.symbol).catch((error) => {
				console.error(`Failed to load token borrow routes data for ${record.symbol}`, error)
				return null
			}),
			tokenRiskPromise
		])
		initialYieldsRows = yieldsRows
		initialTokenBorrowRoutesData = tokenBorrowRoutesData
		tokenRiskData = riskData

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
				initialYieldsRows,
				initialTokenBorrowRoutesData,
				hasLiquidations,
				...(resolvedUnlocksSlug ? { resolvedUnlocksSlug } : {}),
				overview,
				seoTitle,
				seoDescription,
				canonicalUrl: record.route ?? `/token/${encodeURIComponent(record.symbol)}`
			},
			revalidate: maxAgeForNext([22])
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
	await metadataModule.refreshMetadataIfStale()
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

	console.log(paths)

	return { paths, fallback: 'blocking' }
}

export default function TokenPage({
	record,
	tokenRightsData,
	incomeStatementData,
	incomeStatementProtocolName,
	incomeStatementHasIncentives,
	geckoId,
	tokenRiskData,
	initialYieldsRows,
	initialTokenBorrowRoutesData,
	hasLiquidations,
	resolvedUnlocksSlug,
	overview,
	seoTitle,
	seoDescription,
	canonicalUrl
}: InferGetStaticPropsType<typeof getStaticProps>) {
	const shouldRenderYieldsSection = record.is_yields && initialYieldsRows.length > 0
	const shouldRenderBorrowSection =
		(initialTokenBorrowRoutesData?.borrowAsCollateral.length ?? 0) > 0 ||
		(initialTokenBorrowRoutesData?.borrowAsDebt.length ?? 0) > 0
	const visibleSections = [
		{
			id: 'token-overview',
			label: 'Overview',
			element: <TokenOverviewSection overview={overview} geckoId={geckoId} />
		},
		incomeStatementData && incomeStatementProtocolName
			? {
					id: 'token-income-statement',
					label: 'Income Statement',
					element: (
						<TokenIncomeStatementSection
							protocolName={incomeStatementProtocolName}
							incomeStatement={incomeStatementData}
							hasIncentives={incomeStatementHasIncentives}
						/>
					)
				}
			: null,
		tokenRiskData
			? {
					id: 'token-risks',
					label: 'Risks',
					element: <TokenRisksSection tokenSymbol={record.symbol} riskData={tokenRiskData} />
				}
			: null,
		tokenRightsData
			? {
					id: 'token-rights-and-value-accrual',
					label: 'Token Rights',
					element: (
						<TokenRightsByProtocol
							name={record.name}
							symbol={record.symbol}
							tokenRightsData={tokenRightsData}
							raises={null}
							showHeader
							headerVariant="embedded"
						/>
					)
				}
			: null,
		{
			id: 'token-usage',
			label: 'Token Usage',
			element: <TokenUsageSection tokenSymbol={record.symbol} />
		},
		hasLiquidations
			? {
					id: 'token-liquidations',
					label: 'Liquidations',
					element: <TokenLiquidationsSection tokenSymbol={record.symbol} />
				}
			: null,
		resolvedUnlocksSlug
			? {
					id: 'token-unlocks',
					label: 'Unlocks',
					element: <TokenUnlocksSection resolvedUnlocksSlug={resolvedUnlocksSlug} />
				}
			: null,
		shouldRenderYieldsSection
			? {
					id: 'token-yields',
					label: 'Yields',
					element: <TokenYieldsSection tokenSymbol={record.symbol} initialData={initialYieldsRows} />
				}
			: null,
		shouldRenderBorrowSection
			? {
					id: 'token-borrow',
					label: 'Borrow',
					element: (
						<TokenBorrowSection tokenSymbol={record.symbol} initialData={initialTokenBorrowRoutesData ?? undefined} />
					)
				}
			: null
	].filter((section): section is TokenPageSection => section !== null)

	return (
		<Layout title={seoTitle} description={seoDescription} canonicalUrl={canonicalUrl}>
			<div className="flex flex-col gap-2">
				<TokenPageSectionNav sections={visibleSections.map(({ id, label }) => ({ id, label }))} />
				{visibleSections.map((section) => cloneElement(section.element, { key: section.id }))}
			</div>
		</Layout>
	)
}
