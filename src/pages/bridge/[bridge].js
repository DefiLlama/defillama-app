import { maxAgeForNext } from '~/api'
import { BridgeProtocolOverview } from '~/containers/Bridges/BridgeProtocolOverview'
import { getBridgePageDatanew } from '~/containers/Bridges/queries.server'
import { withPerformanceLogging } from '~/utils/perf'

// todo check name in metadata
export const getStaticProps = withPerformanceLogging('bridge/[bridge]', async ({ params }) => {
	if (!params?.bridge) {
		return { notFound: true, props: null }
	}

	const bridge = params.bridge
	const props = await getBridgePageDatanew(bridge)

	if (!props) {
		return {
			notFound: true,
			revalidate: maxAgeForNext([22])
		}
	}

	return {
		props,
		revalidate: maxAgeForNext([22])
	}
})

export async function getStaticPaths() {
	return { paths: [], fallback: 'blocking' }
}

export default function Bridge(props) {
	return <BridgeProtocolOverview {...props} />
}
