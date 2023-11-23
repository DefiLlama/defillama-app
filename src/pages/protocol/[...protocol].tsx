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

export const useCollectionData = (slug) => {
	const { data, error } = useSWR(slug, getProtocolData)
	return { data, error, loading: !data && !error }
}

export default function Protocols() {
	const router = useRouter()
	const { data, loading: fetchingData } = useCollectionData(router.query.protocol)
	if (fetchingData) {
		return (
			<Layout title={'Protocol - DefiLlama'}>
				<LocalLoader />
			</Layout>
		)
	}
	const props = data.props
	return (
		<ProtocolContainer
			title={`${props.protocolData.name} - DefiLlama`}
			protocolData={props.protocolData}
			{...(props as any)}
		/>
	)
}
