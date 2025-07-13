import ProtocolContainer from '~/containers/ProtocolOverview/index-old'
import { withPerformanceLogging } from '~/utils/perf'
import { getProtocolData } from '~/api/categories/protocols/getProtocolData'
import { isCpusHot } from '~/utils/cache-client'
import { getProtocol } from '~/containers/ProtocolOverview/queries'
import { slug } from '~/utils'
import { IProtocolMetadata } from '~/containers/ProtocolOverview/types'

export const getStaticProps = withPerformanceLogging(
	'protocol/tvl/[...protocol]',
	async ({
		params: {
			protocol: [protocol]
		}
	}) => {
		let isHot = false
		const IS_RUNTIME = !!process.env.IS_RUNTIME

		if (IS_RUNTIME) {
			isHot = await isCpusHot()
		}

		const normalizedName = slug(protocol)
		const metadataCache = await import('~/utils/metadata').then((m) => m.default)
		const { protocolMetadata } = metadataCache
		let metadata: [string, IProtocolMetadata] | undefined
		for (const key in protocolMetadata) {
			if (protocolMetadata[key].name === normalizedName) {
				metadata = [key, protocolMetadata[key]]
				break
			}
		}

		if (!metadata || !metadata[1].tvl) {
			return { notFound: true, props: null }
		}

		const protocolData = await getProtocol(protocol)
		const data = await getProtocolData(protocol, protocolData as any, isHot, metadata[1])
		return data
	}
)

export async function getStaticPaths() {
	return { paths: [], fallback: 'blocking' }
}

export default function Protocols({ clientSide, protocolData, ...props }) {
	return (
		<ProtocolContainer
			title={`${protocolData.name} - DefiLlama`}
			protocolData={protocolData}
			{...(props as any)}
			tab="tvl"
		/>
	)
}
