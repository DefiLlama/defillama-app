import type { GetStaticPropsContext, InferGetStaticPropsType } from 'next'
import { TokenOverviewHeader } from '~/components/TokenOverviewHeader'
import { SKIP_BUILD_STATIC_GENERATION } from '~/constants'
import { getProtocolIncomeStatement } from '~/containers/ProtocolOverview/queries'
import { getTokenRiskData } from '~/containers/Token/queries'
import { TokenBorrowSection } from '~/containers/Token/TokenBorrowSection'
import { TokenIncomeStatementSection } from '~/containers/Token/TokenIncomeStatementSection'
import { TokenLongShortSection } from '~/containers/Token/TokenLongShortSection'
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
import { readTokenDirectory } from '~/utils/tokenDirectory'

type TokenRouteParams = {
	token: string
}

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

	if (!lookup.has('morpho-blue')) {
		lookup.set('morpho-blue', 'Morpho Blue')
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
		const tokens = await readTokenDirectory()
		const record = tokens[normalizedToken]

		if (!record) {
			return {
				notFound: true,
				revalidate: maxAgeForNext([22])
			}
		}

		const geckoId = getCoinGeckoId(record.token_nk)

		const metadataModule = await import('~/utils/metadata')
		await metadataModule.refreshMetadataIfStale()
		const metadataCache = metadataModule.default
		const tokenEntry: ITokenListEntry | null = geckoId ? (metadataCache.tokenlist[geckoId] ?? null) : null
		const protocolMetadata = record.protocolId ? (metadataCache.protocolMetadata[record.protocolId] ?? null) : null
		let tokenRightsData: ITokenRightsData | null = null
		let incomeStatementData = null
		let incomeStatementProtocolName: string | null = null
		let incomeStatementHasIncentives = false
		let tokenRiskData: TokenRiskResponse | null = null
		let initialYieldsRows: IYieldTableRow[] = []
		let initialTokenStrategiesData: TokenStrategiesResponse | null = null

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
			const yieldTasks: Array<Promise<unknown>> = [
				getTokenYieldsRows(record.symbol),
				getTokenStrategiesData(record.symbol)
			]

			if (geckoId) {
				yieldTasks.push(
					getTokenRiskData({
						geckoId,
						protocolLlamaswapDataset: metadataCache.protocolLlamaswapDataset,
						displayLookups: {
							protocolDisplayNames: createProtocolDisplayNameLookup(metadataCache.protocolMetadata),
							chainDisplayNames: createChainDisplayNameLookup(metadataCache.chainMetadata)
						}
					})
				)
			}

			const yieldResults = await Promise.all(yieldTasks)
			initialYieldsRows = yieldResults[0] as IYieldTableRow[]
			initialTokenStrategiesData = yieldResults[1] as TokenStrategiesResponse
			tokenRiskData = geckoId ? ((yieldResults[2] as TokenRiskResponse | null | undefined) ?? null) : null
		}

		const displayName = slug(record.symbol) === normalizedToken ? record.symbol : record.name
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
				price: tokenEntry?.current_price ?? null,
				percentChange: tokenEntry?.price_change_percentage_24h ?? null,
				mcap: tokenEntry?.market_cap ?? null,
				fdv: tokenEntry?.fully_diluted_valuation ?? null,
				volume24h: tokenEntry?.total_volume ?? null,
				circSupply: tokenEntry?.circulating_supply ?? null,
				maxSupply: tokenEntry?.max_supply ?? null,
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
	displayName,
	tokenRightsData,
	incomeStatementData,
	incomeStatementProtocolName,
	incomeStatementHasIncentives,
	tokenRiskData,
	initialYieldsRows,
	initialTokenStrategiesData,
	price,
	percentChange,
	mcap,
	fdv,
	volume24h,
	circSupply,
	maxSupply,
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
				<TokenOverviewHeader
					name={record.name}
					title={displayName}
					price={price}
					percentChange={percentChange}
					circSupply={circSupply}
					maxSupply={maxSupply}
					mcap={mcap}
					fdv={fdv}
					volume24h={volume24h}
					symbol={record.symbol}
				/>
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
