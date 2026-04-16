import { promises as fs } from 'fs'
import path from 'path'
import type { GetStaticPropsContext, InferGetStaticPropsType } from 'next'
import { TokenOverviewHeader } from '~/components/TokenOverviewHeader'
import { SKIP_BUILD_STATIC_GENERATION } from '~/constants'
import { fetchTokenRightsData } from '~/containers/TokenRights/api'
import type { ITokenRightsData } from '~/containers/TokenRights/api.types'
import { TokenRightsByProtocol } from '~/containers/TokenRights/TokenRightsByProtocol'
import { findProtocolEntry, parseTokenRightsEntry } from '~/containers/TokenRights/utils'
import Layout from '~/layout'
import { slug } from '~/utils'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import type { ITokenListEntry } from '~/utils/metadata/types'
import { withPerformanceLogging } from '~/utils/perf'

type TokenRouteParams = {
	token: string
}

type TokenDirectoryRecord = {
	name: string
	symbol: string
	token_nk?: string
	protocolId?: string
	chainId?: string
	tokenRights?: boolean
}

type TokenDirectory = Record<string, TokenDirectoryRecord>

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
		const tokensPath = path.join(process.cwd(), 'public', 'tokens.json')
		const tokensJson = await fs.readFile(tokensPath, 'utf8')
		const tokens = JSON.parse(tokensJson) as TokenDirectory
		const record = tokens[normalizedToken]
		if (normalizedToken === 'sui') {
			record.tokenRights = true
		}

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
		let tokenRightsData: ITokenRightsData | null = null

		if (record.tokenRights && (record.chainId || record.protocolId)) {
			const tokenRightsEntries = await fetchTokenRightsData()
			const rawEntry = findProtocolEntry(tokenRightsEntries, record.chainId || record.protocolId)
			tokenRightsData = rawEntry ? parseTokenRightsEntry(rawEntry) : null
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
			</div>
		</Layout>
	)
}
