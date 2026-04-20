import type { GetStaticPropsContext, InferGetStaticPropsType } from 'next'
import { SKIP_BUILD_STATIC_GENERATION } from '~/constants'
import { getProtocolIncomeStatement } from '~/containers/ProtocolOverview/queries'
import { getTokenRiskData } from '~/containers/Token/queries'
import { TokenBorrowSection } from '~/containers/Token/TokenBorrowSection'
import { TokenIncomeStatementSection } from '~/containers/Token/TokenIncomeStatementSection'
import { TokenLongShortSection } from '~/containers/Token/TokenLongShortSection'
import { getTokenOverviewData } from '~/containers/Token/tokenOverview'
import { TokenOverviewSection } from '~/containers/Token/TokenOverviewSection'
import type { TokenRiskResponse } from '~/containers/Token/tokenRisk.types'
import { TokenRisksSection } from '~/containers/Token/TokenRisksSection'
import { getTokenStrategiesData } from '~/containers/Token/tokenStrategies.server'
import type { TokenStrategiesResponse } from '~/containers/Token/tokenStrategies.types'
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
import type { ITokenListEntry } from '~/utils/metadata/types'
import { withPerformanceLogging } from '~/utils/perf'

type TokenRouteParams = {
	token: string
}

const DEFAULT_PROTOCOL_FALLBACK_SLUG = 'morpho-blue'
const DEFAULT_PROTOCOL_FALLBACK_NAME = 'Morpho Blue'

function getCoinGeckoId(tokenNk: string | undefined): string | null {
	if (!tokenNk?.startsWith('coingecko:')) return null
	return tokenNk.slice('coingecko:'.length) || null
}

function createProtocolDisplayNameLookup(
	protocolMetadata: Record<string, { name?: string; displayName?: string }>
): Map<string, string> {
	const lookup = new Map<string, string>()

	for (const metadata of Object.values(protocolMetadata)) {
		if (!metadata?.name) continue
		lookup.set(metadata.name, metadata.displayName ?? metadata.name)
	}

	// TODO: remove this once morpho-blue display metadata is present in the metadata pipeline.
	if (!lookup.has(DEFAULT_PROTOCOL_FALLBACK_SLUG)) {
		lookup.set(DEFAULT_PROTOCOL_FALLBACK_SLUG, DEFAULT_PROTOCOL_FALLBACK_NAME)
	}

	return lookup
}

function createChainDisplayNameLookup(chainMetadata: Record<string, { name?: string }>): Map<string, string> {
	const lookup = new Map<string, string>()

	for (const metadata of Object.values(chainMetadata)) {
		if (!metadata?.name) continue
		lookup.set(slug(metadata.name), metadata.name)
	}

	return lookup
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
		const llamaswapChains = geckoId ? (metadataCache.protocolLlamaswapDataset?.[geckoId] ?? null) : null
		const displayName = slug(record.symbol) === normalizedToken ? record.symbol : record.name
		let tokenRightsData: ITokenRightsData | null = null
		let incomeStatementData = null
		let incomeStatementProtocolName: string | null = null
		let incomeStatementHasIncentives = false
		let tokenRiskData: TokenRiskResponse | null = null
		let initialYieldsRows: IYieldTableRow[] = []
		let initialTokenStrategiesData: TokenStrategiesResponse | null = null
		const overview = await getTokenOverviewData({
			record,
			displayName,
			geckoId,
			tokenEntry,
			protocolMetadata,
			cgExchangeIdentifiers: metadataCache.cgExchangeIdentifiers ?? [],
			llamaswapChains
		})

		if (record.tokenRights && (record.chainId || record.protocolId)) {
			const tokenRightsEntries = await fetchTokenRightsData()
			const rawEntry = findProtocolEntry(tokenRightsEntries, record.chainId || record.protocolId)
			tokenRightsData = rawEntry ? parseTokenRightsEntry(rawEntry) : null
		}

		if (protocolMetadata) {
			incomeStatementData = await getProtocolIncomeStatement({ metadata: protocolMetadata })
			incomeStatementProtocolName = protocolMetadata.displayName
			incomeStatementHasIncentives = Boolean(protocolMetadata.incentives)
		}

		if (record.is_yields) {
			const tokenRiskPromise = geckoId
				? getTokenRiskData({
						geckoId,
						protocolLlamaswapDataset: metadataCache.protocolLlamaswapDataset,
						displayLookups: {
							protocolDisplayNames: createProtocolDisplayNameLookup(metadataCache.protocolMetadata),
							chainDisplayNames: createChainDisplayNameLookup(metadataCache.chainMetadata)
						}
					}).catch((error) => {
						console.error(`Failed to load token risk data for ${geckoId}`, error)
						return null
					})
				: Promise.resolve(null)

			const [yieldsRows, tokenStrategiesData, riskData] = await Promise.all([
				getTokenYieldsRows(record.symbol),
				getTokenStrategiesData(record.symbol),
				tokenRiskPromise
			])
			initialYieldsRows = yieldsRows
			initialTokenStrategiesData = tokenStrategiesData
			tokenRiskData = riskData
		}

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
				initialTokenStrategiesData,
				overview,
				seoTitle,
				seoDescription,
				canonicalUrl: `/token/${token}`
			},
			revalidate: maxAgeForNext([22])
		}
	}
)

export const getStaticPaths = () => {
	// When this is true (in preview environments) don't
	// prerender any static pages
	// (faster builds, but slower initial page load)
	if (SKIP_BUILD_STATIC_GENERATION) {
		return {
			paths: [],
			fallback: 'blocking'
		}
	}

	return { paths: [], fallback: 'blocking' }
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
	initialTokenStrategiesData,
	overview,
	seoTitle,
	seoDescription,
	canonicalUrl
}: InferGetStaticPropsType<typeof getStaticProps>) {
	const shouldRenderYieldsSection = record.is_yields && initialYieldsRows.length > 0
	const shouldRenderBorrowSection =
		record.is_yields &&
		((initialTokenStrategiesData?.borrowAsCollateral.length ?? 0) > 0 ||
			(initialTokenStrategiesData?.borrowAsDebt.length ?? 0) > 0)
	const shouldRenderLongShortSection = record.is_yields && (initialTokenStrategiesData?.longShort.length ?? 0) > 0

	return (
		<Layout title={seoTitle} description={seoDescription} canonicalUrl={canonicalUrl}>
			<div className="flex flex-col gap-2">
				<TokenOverviewSection overview={overview} geckoId={geckoId} />
				{incomeStatementData && incomeStatementProtocolName ? (
					<TokenIncomeStatementSection
						protocolName={incomeStatementProtocolName}
						incomeStatement={incomeStatementData}
						hasIncentives={incomeStatementHasIncentives}
					/>
				) : null}
				{record.is_yields && tokenRiskData ? (
					<TokenRisksSection tokenSymbol={record.symbol} riskData={tokenRiskData} />
				) : null}
				{tokenRightsData ? (
					<TokenRightsByProtocol
						name={record.name}
						symbol={record.symbol}
						tokenRightsData={tokenRightsData}
						raises={null}
						showHeader
						headerVariant="embedded"
					/>
				) : null}
				<TokenUsageSection tokenSymbol={record.symbol} />
				{shouldRenderYieldsSection ? (
					<TokenYieldsSection tokenSymbol={record.symbol} initialData={initialYieldsRows} />
				) : null}
				{shouldRenderBorrowSection ? (
					<TokenBorrowSection tokenSymbol={record.symbol} initialData={initialTokenStrategiesData ?? undefined} />
				) : null}
				{shouldRenderLongShortSection ? (
					<TokenLongShortSection tokenSymbol={record.symbol} initialData={initialTokenStrategiesData ?? undefined} />
				) : null}
			</div>
		</Layout>
	)
}
