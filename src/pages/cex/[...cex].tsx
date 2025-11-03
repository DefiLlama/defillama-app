import { maxAgeForNext } from '~/api'
import { CEXS_API } from '~/constants'
import { ProtocolOverview } from '~/containers/ProtocolOverview'
import { getProtocolOverviewPageData } from '~/containers/ProtocolOverview/queries'
import { IProtocolOverviewPageData } from '~/containers/ProtocolOverview/types'
import { slug } from '~/utils'
import { fetchJson } from '~/utils/async'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging(
	'cex/[...cex]',
	async ({
		params: {
			cex: [exchangeName]
		}
	}) => {
		const metadataCache = await import('~/utils/metadata').then((m) => m.default)
		const cexs = metadataCache.cexs
		// if cex is not string, return 404
		const exchangeData = cexs.find(
			(cex) => cex.slug && (slug(cex.slug) === slug(exchangeName) || slug(cex.name) === slug(exchangeName))
		)

		if (typeof exchangeName !== 'string' || !exchangeData) {
			return {
				notFound: true
			}
		}

		const data = await getProtocolOverviewPageData({
			protocolId: slug(exchangeData.slug),
			metadata: {
				displayName: exchangeData.slug?.split('-')?.join(' ') ?? exchangeData.name,
				tvl: true,
				stablecoins: true
			},
			isCEX: true
		})

		if (!data) {
			return { notFound: true, props: null }
		}

		return { props: data, revalidate: maxAgeForNext([22]) }
	}
)

export async function getStaticPaths() {
	const { cexs } = await fetchJson(CEXS_API)

	const paths = cexs
		.filter((cex) => cex.slug)
		.map((cex) => ({
			params: { cex: [slug(cex.slug)] }
		}))
		.slice(0, 10)

	return { paths, fallback: 'blocking' }
}

export default function Protocols(props: IProtocolOverviewPageData) {
	return <ProtocolOverview {...props} />
}
//triggercaches
