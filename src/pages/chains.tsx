import * as React from 'react'
import { maxAgeForNext } from '~/api'
import { ChainsByCategory } from '~/containers/ChainsByCategory'
import { getChainsByCategory2 } from '~/containers/ChainsByCategory/queries'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging('chains', async () => {
	const data = await getChainsByCategory2({ category: 'All', sampledChart: true })

	return {
		props: data,
		revalidate: maxAgeForNext([22])
	}
})

export default function Chains(props) {
	return <ChainsByCategory {...props} />
}
