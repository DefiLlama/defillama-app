import * as React from 'react'
import { maxAgeForNext } from '~/api'
import { BridgedTVLByChain } from '~/containers/BridgedTVL/BridgedTVLByChain'
import { getBridgedTVLByChain } from '~/containers/BridgedTVL/queries'
import Layout from '~/layout'
import { capitalizeFirstLetter, slug } from '~/utils'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging(
	'bridged/[...chain]',
	async ({
		params: {
			chain: [chain]
		}
	}) => {
		const metadataCache = await import('~/utils/metadata').then((m) => m.default)
		const chainMetadata = metadataCache.chainMetadata[slug(chain)]
		if (!chainMetadata || !chainMetadata.chainAssets) {
			return { notFound: true }
		}

		const data = await getBridgedTVLByChain(chain)

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
			canonicalUrl={`/bridged/${props.chain}`}
			pageName={pageName}
		>
			<BridgedTVLByChain {...props} />
		</Layout>
	)
}
