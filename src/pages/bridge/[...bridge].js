import * as React from 'react'
import { maxAgeForNext } from '~/api'
import { BridgeProtocolOverview } from '~/containers/Bridges/BridgeProtocolOverview'
import { getBridgePageDatanew } from '~/containers/Bridges/queries.server'
import { withPerformanceLogging } from '~/utils/perf'

// todo check name in metadata
export const getStaticProps = withPerformanceLogging(
	'bridge/[...bridge]',
	async ({
		params: {
			bridge: [bridge]
		}
	}) => {
		const props = await getBridgePageDatanew(bridge)

		return {
			props,
			revalidate: maxAgeForNext([22])
		}
	}
)

export async function getStaticPaths() {
	return { paths: [], fallback: 'blocking' }
}

export default function Bridge(props) {
	return <BridgeProtocolOverview {...props} />
}
