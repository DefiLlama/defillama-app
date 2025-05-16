import ProtocolContainer from '~/containers/ProtocolOverview'
import { withPerformanceLogging } from '~/utils/perf'
import { getProtocolData } from '~/api/categories/protocols/getProtocolData'
import { isCpusHot } from '~/utils/cache-client'
import metadata from '~/utils/metadata'
import { getProtocol } from '~/containers/ProtocolOverview/queries'
const { protocolMetadata } = metadata

export const getStaticProps = withPerformanceLogging(
	'protocol/treasury[...protocol]',
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

		const metadata = Object.entries(protocolMetadata).find((p) => (p[1] as any).name === protocol)?.[1]

		if (!metadata) {
			return { notFound: true, props: null }
		}

		const protocolData = await getProtocol(protocol)
		const data = await getProtocolData(protocol, protocolData, isHot, metadata)
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
			tab="treasury"
		/>
	)
}
