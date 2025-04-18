import * as React from 'react'
import Layout from '~/layout'
import { BridgedTVLChainsList } from '~/containers/BridgedTVL/BridgedTVLChainsList'
import { maxAgeForNext } from '~/api'
import { getChainsBridged } from '~/api/categories/protocols'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging('bridged', async () => {
	const data = await getChainsBridged()

	return {
		props: data,
		revalidate: maxAgeForNext([22])
	}
})

export default function Chains(props) {
	return (
		<Layout title={`Bridged TVL - DefiLlama`} defaultSEO>
			<BridgedTVLChainsList {...props} />
		</Layout>
	)
}
