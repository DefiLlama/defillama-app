import * as React from 'react'
import { maxAgeForNext } from '~/api'
import { BridgedTVLChainsList } from '~/containers/BridgedTVL/BridgedTVLChainsList'
import { getBridgedTVLByChain } from '~/containers/BridgedTVL/queries'
import Layout from '~/layout'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging('bridged', async () => {
	const data = await getBridgedTVLByChain()

	return {
		props: data,
		revalidate: maxAgeForNext([22])
	}
})

const pageName = ['Chains', 'ranked by', 'Bridged TVL']

export default function Chains(props) {
	return (
		<Layout
			title={`Bridged TVL - DefiLlama`}
			description={`Track the total value of all tokens held on each blockchain network. Monitor bridged TVL across chains and compare token holdings between different blockchains on DefiLlama.`}
			keywords="bridged TVL, blockchain TVL, token holdings, total value on blockchain, total value on chain"
			canonicalUrl="/bridged"
			pageName={pageName}
		>
			<BridgedTVLChainsList {...props} />
		</Layout>
	)
}
