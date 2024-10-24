import ProtocolContainer from '~/containers/Defi/Protocol'
import { standardizeProtocolName } from '~/utils'
import { getProtocol, getProtocols } from '~/api/categories/protocols'
import { withPerformanceLogging } from '~/utils/perf'
import { getProtocolData, getProtocolDataLite } from '~/api/categories/protocols/getProtocolData'
import { useRouter } from 'next/router'
import { isCpusHot } from '~/utils/cache-client'
import { useQuery } from '@tanstack/react-query'

export const getStaticProps = withPerformanceLogging(
	'protocol/[...protocol]',
	async ({
		params: {
			protocol: [protocol]
		}
	}) => {
		let isHot = false
		const IS_RUNTIME = !!process.env.IS_RUNTIME

		// if (IS_RUNTIME) {
		// 	isHot = await isCpusHot()
		// }

		const protocolData = await getProtocol(protocol)

		if (isHot && !protocolData?.id?.includes('parent#')) {
			const data = await getProtocolDataLite(protocol, protocolData)
			return data
		} else {
			const data = await getProtocolData(protocol, protocolData)
			return data
		}
	}
)

export async function getStaticPaths() {
	const res = await getProtocols()

	const paths: string[] = res.protocols.slice(0, 30).map(({ name }) => ({
		params: { protocol: [standardizeProtocolName(name)] }
	}))

	return { paths, fallback: 'blocking' }
}

const fetchProtocolData = async (protocol: string | null) => {
	if (!protocol) return null
	try {
		const protocolData = await getProtocol(protocol)
		const finalData = await getProtocolData(protocol, protocolData)
		return finalData
	} catch (error) {
		console.log(protocol, error)
		throw new Error(error instanceof Error ? error.message : `Failed to fetch ${protocol}`)
	}
}

const useProtocolData = (slug) => {
	return useQuery({ queryKey: ['protocol-data', slug], queryFn: () => fetchProtocolData(slug) })
}

export default function Protocols({ clientSide, protocolData, ...props }) {
	const router = useRouter()

	const { data, isLoading } = useProtocolData(clientSide === true ? router.query.protocol : null)

	if (clientSide === true) {
		if (!isLoading && data) {
			props = data.props
			protocolData = props.protocolData
		}
	}

	return (
		<ProtocolContainer title={`${protocolData.name} - DefiLlama`} protocolData={protocolData} {...(props as any)} />
	)
}
