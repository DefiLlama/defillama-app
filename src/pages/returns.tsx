import * as React from 'react'
import Layout from '~/layout'
import { maxAgeForNext } from '~/api'
import { getCategoryReturns } from '~/api/categories/protocols'
import { withPerformanceLogging } from '~/utils/perf'
import { ProtocolsChainsSearch } from '~/components/Search'

import { CategoryReturnsContainer } from '~/containers/CategoryReturnsContainer'

export const getStaticProps = withPerformanceLogging('returns', async () => {
	const returns = await getCategoryReturns()

	return {
		props: { returns: returns.categoryReturns, isCoinPage: false },
		revalidate: maxAgeForNext([22])
	}
})

export default function CategoryReturns(props) {
	return (
		<Layout title={`Category Returns - DefiLlama`} defaultSEO>
			<ProtocolsChainsSearch step={{ category: 'Home', name: 'Returns' }} />
			<CategoryReturnsContainer {...props} />
		</Layout>
	)
}
