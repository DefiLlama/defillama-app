import * as React from 'react'
import { maxAgeForNext } from '~/api'
import { withPerformanceLogging } from '~/utils/perf'
import { ChainsByCategory } from '~/containers/ChainsByCategory'
import { getChainsByCategory } from '~/containers/ChainsByCategory/queries'

export const getStaticProps = withPerformanceLogging('chains', async () => {
	const data = await getChainsByCategory({ category: 'All', sampledChart: true })

	return {
		props: data,
		revalidate: maxAgeForNext([22])
	}
})

export default function Chains(props) {
	return <ChainsByCategory {...props} />
}
