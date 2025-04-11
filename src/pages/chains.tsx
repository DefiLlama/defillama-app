import * as React from 'react'
import { maxAgeForNext } from '~/api'
import { withPerformanceLogging } from '~/utils/perf'
import { ChainsByCategory } from '~/ChainsByCategory'
import { getChainsByCategory } from '~/ChainsByCategory/queries'

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
