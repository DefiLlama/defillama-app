import ProtocolContainer from '~/containers/Defi/Protocol/PorotcolPro'
import { standardizeProtocolName } from '~/utils'
import { getProtocols } from '~/api/categories/protocols'
import { DummyProtocol } from '~/containers/Defi/Protocol/Dummy'
import { withPerformanceLogging } from '~/utils/perf'
import { getProtocolData } from '~/api/categories/protocols/getProtocolData'

export const getStaticProps = withPerformanceLogging(
	'protocol/[...protocol]',
	async ({
		params: {
			protocol: [protocol]
		}
	}) => {
		const data = await getProtocolData(protocol)
		return data
	}
)

export async function getStaticPaths() {
	const res = await getProtocols()

	const paths: string[] = res.protocols.slice(0, 30).map(({ name }) => ({
		params: { protocol: [standardizeProtocolName(name)] }
	}))

	return { paths, fallback: 'blocking' }
}

export default function Protocols({ protocolData, ...props }) {
	return (
		<ProtocolContainer title={`${protocolData.name} - DefiLlama`} protocolData={protocolData} {...(props as any)} />
	)
}
