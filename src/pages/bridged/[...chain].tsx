import * as React from 'react'
import { maxAgeForNext } from '~/api'
import { getChainsBridged } from '~/api/categories/protocols'
import { BridgedTVLByChain } from '~/containers/BridgedTVL/BridgedTVLByChain'
import Layout from '~/layout'
import { capitalizeFirstLetter } from '~/utils'
import { withPerformanceLogging } from '~/utils/perf'

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

const pageName = ['Bridged TVL', 'by', 'Chain']

export default function Bridged(props) {
	if (!props.chainData) {
		return <div>Not found</div>
	}
	return (
		<Layout
			title={`${props.chainName} Bridged TVL - DefiLlama`}
			description={`Track bridged TVL on ${props.chainName} - View total value of all tokens held on ${props.chainName}. Real-time DeFi bridge analytics from DefiLlama.`}
			keywords={`bridged tvl ${props.chainName}, tokens value on ${props.chainName}`}
			canonicalUrl={`/bridged-tvl/${props.chain}`}
			pageName={pageName}
		>
			<BridgedTVLByChain {...props} />
		</Layout>
	)
}
