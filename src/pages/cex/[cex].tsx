import type { GetStaticPropsContext } from 'next'
import { SKIP_BUILD_STATIC_GENERATION } from '~/constants'
import { fetchCexs } from '~/containers/Cexs/api'
import type { ExchangeMarketsListResponse } from '~/containers/Cexs/markets.types'
import { ProtocolOverview } from '~/containers/ProtocolOverview'
import { getProtocolOverviewPageData } from '~/containers/ProtocolOverview/queries'
import type { IProtocolOverviewPageData } from '~/containers/ProtocolOverview/types'
import { slug } from '~/utils'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging(
	'cex/[cex]',
	async ({ params }: GetStaticPropsContext<{ cex: string }>) => {
		if (!params?.cex) {
			return { notFound: true }
		}

		const exchangeName = params.cex
		const metadataModule = await import('~/utils/metadata')
		await metadataModule.refreshMetadataIfStale()
		const metadataCache = metadataModule.default
		const cexs = metadataCache.cexs

		const exchangeData = cexs.find(
			(cex) => cex.slug && (slug(cex.slug) === slug(exchangeName) || slug(cex.name) === slug(exchangeName))
		)

		if (!exchangeData) {
			return {
				notFound: true
			}
		}

		const exchangesList = (await import('../../../.cache/datasets/markets/exchanges-list.json'))
			.default as ExchangeMarketsListResponse
		const normalizedCexSlug = slug(exchangeData.slug ?? '')
		let cexMarketsExchange: string | null = null
		let cexMarketsSlug: string | null = null
		for (const entry of exchangesList.cex.spot) {
			if (entry.defillama_slug && slug(entry.defillama_slug) === normalizedCexSlug) {
				cexMarketsExchange = entry.exchange
				cexMarketsSlug = entry.defillama_slug
				break
			}
		}
		if (!cexMarketsExchange) {
			for (const entry of exchangesList.cex.linear_perp) {
				if (entry.defillama_slug && slug(entry.defillama_slug) === normalizedCexSlug) {
					cexMarketsExchange = entry.exchange
					cexMarketsSlug = entry.defillama_slug
					break
				}
			}
		}
		if (!cexMarketsExchange) {
			for (const entry of exchangesList.cex.inverse_perp) {
				if (entry.defillama_slug && slug(entry.defillama_slug) === normalizedCexSlug) {
					cexMarketsExchange = entry.exchange
					cexMarketsSlug = entry.defillama_slug
					break
				}
			}
		}

		const data = await getProtocolOverviewPageData({
			protocolId: slug(exchangeData.slug),
			currentProtocolMetadata: {
				displayName: exchangeData.slug?.split('-')?.join(' ') ?? exchangeData.name,
				tvl: true,
				stablecoins: true
			},
			isCEX: true,
			chainMetadata: metadataCache.chainMetadata,
			tokenlist: metadataCache.tokenlist,
			cgExchangeIdentifiers: metadataCache.cgExchangeIdentifiers
		})

		if (!data) {
			return { notFound: true }
		}

		return { props: { ...data, cexMarketsExchange, cexMarketsSlug }, revalidate: maxAgeForNext([22]) }
	}
)

export async function getStaticPaths() {
	// When this is true (in preview environments) don't
	// prerender any static pages
	// (faster builds, but slower initial page load)
	if (SKIP_BUILD_STATIC_GENERATION) {
		return {
			paths: [],
			fallback: 'blocking'
		}
	}

	const { cexs } = await fetchCexs()

	const paths = cexs
		.filter((cex) => cex.slug)
		.map((cex) => ({
			params: { cex: slug(cex.slug) }
		}))
		.slice(0, 10)

	return { paths, fallback: 'blocking' }
}

export default function Protocols(props: IProtocolOverviewPageData) {
	return <ProtocolOverview {...props} />
}
//triggercaches
