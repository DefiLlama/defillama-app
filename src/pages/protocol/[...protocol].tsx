import ProtocolContainer from '~/containers/Defi/Protocol'
import { standardizeProtocolName } from '~/utils'
import { getProtocols } from '~/api/categories/protocols'
import { DummyProtocol } from '~/containers/Defi/Protocol/Dummy'
import { withPerformanceLogging } from '~/utils/perf'
import { getProtocolData } from '~/api/categories/protocols/getProtocolData'
import { useRouter } from 'next/router'
import Layout from '~/layout'
import LocalLoader from '~/components/LocalLoader'
import useSWR from 'swr'
import { cpus } from 'os'

export const getStaticProps = withPerformanceLogging(
	'protocol/[...protocol]',
	async ({
		params: {
			protocol: [protocol]
		}
	}) => {
		const hotCpus = cpus().filter((core) => {
			const total = Object.values(core.times).reduce((sum, v) => sum + v)
			const load = 1 - core.times.idle / total
			return load > 0.8
		}).length
		if (hotCpus >= 5) {
			return {
				revalidate: 1,
				props: {
					clientSide: true
				}
			}
		} else {
			const data = await getProtocolData(protocol)
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

const useProtocolData = (slug) => {
	const { data, error } = useSWR(slug, getProtocolData)
	return { data, error, loading: !data && !error }
}

export default function Protocols({ clientSide, protocolData, ...props }) {
	const router = useRouter()
	const { data, loading: fetchingData } = useProtocolData(clientSide === true ? router.query.protocol : null)
	if (clientSide === true) {
		if (fetchingData) {
			return (
				<Layout title={'Protocol - DefiLlama'}>
					<LocalLoader />
				</Layout>
			)
		}
		props = data.props
		protocolData = props.protocolData
	}
	return (
		<ProtocolContainer title={`${protocolData.name} - DefiLlama`} protocolData={protocolData} {...(props as any)} />
	)
}
