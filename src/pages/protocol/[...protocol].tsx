import ProtocolContainer from '~/containers/Defi/Protocol'
import { standardizeProtocolName } from '~/utils'
import { getProtocol, getProtocols } from '~/api/categories/protocols'
import { withPerformanceLogging } from '~/utils/perf'
import { getProtocolData } from '~/api/categories/protocols/getProtocolData'
import { isCpusHot } from '~/utils/cache-client'
import { useQuery } from '@tanstack/react-query'
import protocolMetadata from 'metadata/protocols.json'

export const getStaticProps = withPerformanceLogging(
	'protocol/[...protocol]',
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

		const metadata = Object.entries(protocolMetadata).find((p) => (p[1] as any).name === protocol)

		if (!metadata) {
			return { notFound: true, props: null }
		}

		const protocolData = await getProtocol(protocol)
		const data = await getProtocolData(protocol, protocolData, isHot)
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

const fetchProtocolData = async (protocol: string | null, colors) => {
	if (!protocol) return null
	try {
		const protocolData = await getProtocol(protocol)
		const finalData = await getProtocolData(protocol, protocolData, false)
		if (finalData.props) {
			finalData.props.backgroundColor = colors.backgroundColor
			finalData.props.chartColors = colors.chartColors
		}
		return finalData
	} catch (error) {
		console.log(protocol, error)
		throw new Error(error instanceof Error ? error.message : `Failed to fetch ${protocol}`)
	}
}

const useProtocolData = (slug, protocolData) => {
	return useQuery({
		queryKey: ['protocol-data', slug],
		queryFn: () => fetchProtocolData(slug, protocolData),
		retry: 0,
		staleTime: 60 * 60 * 1000,
		refetchInterval: 60 * 60 * 1000
	})
}

export default function Protocols({ clientSide, protocolData, ...props }) {
	const { data, isLoading } = useProtocolData(clientSide === true ? props.protocol : null, {
		backgroundColor: props.backgroundColor,
		chartColors: props.chartColors
	})

	if (clientSide === true) {
		if (!isLoading && data) {
			return (
				<ProtocolContainer
					title={`${protocolData.name} - DefiLlama`}
					protocolData={protocolData}
					{...(data.props as any)}
				/>
			)
		}
	}

	return (
		<ProtocolContainer title={`${protocolData.name} - DefiLlama`} protocolData={protocolData} {...(props as any)} />
	)
}
