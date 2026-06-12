import type { GetStaticPropsContext } from 'next'
import { SKIP_BUILD_STATIC_GENERATION } from '~/constants'
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
		const [{ default: metadataCache }, { resolveCexParamFromMetadata }] = await Promise.all([
			import('~/utils/metadata'),
			import('~/server/routeCache/assets')
		])
		const cexRoute = resolveCexParamFromMetadata(exchangeName, metadataCache)

		if (!cexRoute) {
			console.warn(
				`[cex/[cex]] ${exchangeName} not found in metadata cache (${metadataCache.cexs.length} CEX entries loaded)`
			)
			return {
				notFound: true
			}
		}
		const exchangeData = cexRoute.metadata

		const { resolveCexMarketsByDefillamaSlug } = await import('~/server/datasetCache/runtime/markets')
		const [cexMarkets, data] = await Promise.all([
			resolveCexMarketsByDefillamaSlug(exchangeData.slug ?? ''),
			getProtocolOverviewPageData({
				protocolId: slug(exchangeData.slug),
				currentProtocolMetadata: {
					displayName: exchangeData.slug?.split('-')?.join(' ') ?? exchangeData.name,
					tvl: true,
					stablecoins: true
				},
				isCEX: true,
				chainMetadata: metadataCache.chainMetadata,
				tokenlist: metadataCache.tokenlist,
				cgExchangeIdentifiers: metadataCache.cgExchangeIdentifiers,
				emissionsSupplyMetrics: metadataCache.emissionsSupplyMetrics
			})
		])
		const cexMarketsExchange = cexMarkets?.exchange ?? null
		const cexMarketsSlug = cexMarkets?.defillama_slug ?? null

		if (!data) {
			console.warn(`[cex/[cex]] ${exchangeName} matched metadata but overview data was unavailable`)
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

	const { getCexStaticPaths } = await import('~/server/routeCache/assets')
	const paths = await getCexStaticPaths()

	return { paths, fallback: 'blocking' }
}

export default function Protocols(props: IProtocolOverviewPageData) {
	return <ProtocolOverview {...props} />
}
