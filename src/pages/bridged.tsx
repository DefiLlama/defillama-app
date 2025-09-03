import * as React from 'react'
import { maxAgeForNext } from '~/api'
import { getChainsBridged } from '~/api/categories/protocols'
import { BridgedTVLChainsList } from '~/containers/BridgedTVL/BridgedTVLChainsList'
import Layout from '~/layout'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging('bridged', async () => {
	const data = await getChainsBridged()

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
