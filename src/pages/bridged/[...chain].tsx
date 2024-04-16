import * as React from 'react'
import BridgeContainer from '~/containers/BridgeContainer'
import { standardizeProtocolName } from '~/utils'
import { maxAgeForNext } from '~/api'
import { getBridgePageDatanew, getBridges } from '~/api/categories/bridges'
import { withPerformanceLogging } from '~/utils/perf'
import { getChainsBridged } from '~/api/categories/protocols'
import ChainBridged from '~/containers/BridgedContainer/ChainBridged'

export const getStaticProps = withPerformanceLogging(
	'bridged/[...chain]',
	async ({
		params: {
			chain: [chain]
		}
	}) => {
		const data = await getChainsBridged(chain?.toLowerCase())

		return {
			props: { ...data, chain },
			revalidate: maxAgeForNext([22])
		}
	}
)

export async function getStaticPaths() {
	return { paths: [], fallback: 'blocking' }
}

export default function Bridged(props) {
	if (!props.chainData) {
		return <div>Not found</div>
	}
	return <ChainBridged {...props} />
}
