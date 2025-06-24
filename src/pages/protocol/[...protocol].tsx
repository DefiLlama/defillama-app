import { slug } from '~/utils'
import { withPerformanceLogging } from '~/utils/perf'
import metadata from '~/utils/metadata'
import { getProtocolOverviewPageData } from '~/containers/ProtocolOverview/queries'
import { maxAgeForNext } from '~/api'
import { ProtocolOverview } from '~/containers/ProtocolOverview'
import { IProtocolOverviewPageData } from '~/containers/ProtocolOverview/types'
import { PROTOCOLS_API } from '~/constants'
import { fetchWithErrorLogging } from '~/utils/async'
const { protocolMetadata } = metadata

export const getStaticProps = withPerformanceLogging(
	'protocol/[...protocol]',
	async ({
		params: {
			protocol: [protocol]
		}
	}) => {
		const normalizedName = slug(protocol)
		const metadata = Object.entries(protocolMetadata).find((p) => p[1].name === normalizedName)

		if (!metadata) {
			return { notFound: true, props: null }
		}

		const data = await getProtocolOverviewPageData({
			protocolId: metadata[0],
			metadata: metadata[1]
		})

		if (!data) {
			return { notFound: true, props: null }
		}

		return { props: data, revalidate: maxAgeForNext([22]) }
	}
)
export async function getStaticPaths() {
	const res = await fetchWithErrorLogging(PROTOCOLS_API).then((r) => r.json())

	const paths: string[] = res.protocols.slice(0, 30).map(({ name }) => ({
		params: { protocol: [slug(name)] }
	}))

	return { paths, fallback: 'blocking' }
}

export default function Protocols(props: IProtocolOverviewPageData) {
	return <ProtocolOverview {...props} />
}
