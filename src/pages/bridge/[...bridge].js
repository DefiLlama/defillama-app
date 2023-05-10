import * as React from 'react'
import BridgeContainer from '~/containers/BridgeContainer'
import { standardizeProtocolName } from '~/utils'
import { maxAgeForNext } from '~/api'
import { getBridgePageDatanew, getBridges } from '~/api/categories/bridges'
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
	const res = await getBridges()

	const paths = res.bridges.map(({ displayName }) => ({
		params: { bridge: [standardizeProtocolName(displayName)] }
	}))

	return { paths, fallback: 'blocking' }
}

export default function Bridge(props) {
	return <BridgeContainer {...props} />
}
