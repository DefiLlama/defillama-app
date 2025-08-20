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

export default function Chains(props) {
	return (
		<Layout title={`Bridged TVL - DefiLlama`} defaultSEO>
			<BridgedTVLChainsList {...props} />
		</Layout>
	)
}
