import * as React from 'react'
import BridgeContainer from '~/containers/BridgeContainer'
import { maxAgeForNext } from '~/api'
import { getBridgePageDatanew } from '~/Bridges/queries.server'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging(
	'bridge/[...bridge]',
	async ({
		params: {
			bridge: [bridge]
		}
	}) => {
		const data = await getBridgePageDatanew(bridge)

		return {
			props: {
				...data
			},
			revalidate: maxAgeForNext([22])
		}
	}
)

export async function getStaticPaths() {
	return { paths: [], fallback: 'blocking' }
}

export default function Bridge(props) {
	return <BridgeContainer {...props} />
}
