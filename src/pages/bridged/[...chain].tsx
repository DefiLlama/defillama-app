import * as React from 'react'
import { capitalizeFirstLetter } from '~/utils'
import { maxAgeForNext } from '~/api'
import { withPerformanceLogging } from '~/utils/perf'
import { getChainsBridged } from '~/api/categories/protocols'
import { BridgedTVLByChain } from '~/containers/BridgedTVL/BridgedTVLByChain'

export const getStaticProps = withPerformanceLogging(
	'bridged/[...chain]',
	async ({
		params: {
			chain: [chain]
		}
	}) => {
		const data = await getChainsBridged(chain)

		return {
			props: { ...data, chain, chainName: capitalizeFirstLetter(chain) },
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
	return <BridgedTVLByChain {...props} />
}
