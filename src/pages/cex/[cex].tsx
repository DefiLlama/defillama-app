import type { GetStaticPropsContext } from 'next'
import { maxAgeForNext } from '~/api'
import { SKIP_BUILD_STATIC_GENERATION } from '~/constants'
import { fetchCexs } from '~/containers/Cexs/api'
import { ProtocolOverview } from '~/containers/ProtocolOverview'
import { getProtocolOverviewPageData } from '~/containers/ProtocolOverview/queries'
import type { IProtocolOverviewPageData } from '~/containers/ProtocolOverview/types'
import { slug } from '~/utils'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging(
	'cex/[cex]',
	async ({ params }: GetStaticPropsContext<{ cex: string }>) => {
		if (!params?.cex) {
			return { notFound: true, props: null }
		}

		const exchangeName = params.cex
		const metadataCache = await import('~/utils/metadata').then((m) => m.default)
		const cexs = metadataCache.cexs

		const exchangeData = cexs.find(
			(cex) => cex.slug && (slug(cex.slug) === slug(exchangeName) || slug(cex.name) === slug(exchangeName))
		)

		if (!exchangeData) {
			return {
				notFound: true
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
			chainMetadata: metadataCache.chainMetadata
		})

		if (!data) {
			return { notFound: true, props: null }
		}

		return { props: data, revalidate: maxAgeForNext([22]) }
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
