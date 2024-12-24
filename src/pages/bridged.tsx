import * as React from 'react'
import Layout from '~/layout'
import ChainsContainer from '~/containers/BridgedContainer'
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
	console.log([props])
	return (
		<Layout title={`All Chains Bridged TVL - DefiLlama`} defaultSEO>
			<ChainsContainer {...props} />
		</Layout>
	)
}
