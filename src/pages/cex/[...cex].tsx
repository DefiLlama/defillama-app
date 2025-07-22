import { ProtocolOverview } from '~/containers/ProtocolOverview'
import { maxAgeForNext } from '~/api'
import { cexData } from '../cexs'
import { withPerformanceLogging } from '~/utils/perf'
import { getProtocolOverviewPageData } from '~/containers/ProtocolOverview/queries'
import { IProtocolOverviewPageData } from '~/containers/ProtocolOverview/types'
import { slug } from '~/utils'

export const getStaticProps = withPerformanceLogging(
	'cex/[...cex]',
	async ({
		params: {
			cex: [exchangeName]
		}
	}) => {
		// if cex is not string, return 404
		const exchangeData = cexData.find(
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
				displayName: exchangeData.name,
				tvl: true
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
	const paths = cexData
		.filter((cex) => cex.slug)
		.map(({ slug }) => ({
			params: { cex: [slug] }
		}))

	return { paths, fallback: 'blocking' }
}

export default function Protocols(props: IProtocolOverviewPageData) {
	return <ProtocolOverview {...props} />
}
