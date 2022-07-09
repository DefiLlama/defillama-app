import Head from 'next/head'
import { mutate } from 'swr'
import Layout from '~/layout'
import YieldPage from '~/components/YieldsPage'
import { arrayFetcher } from '~/utils/useSWR'
import { YIELD_AGGREGATION_API, YIELD_POOLS_API } from '~/constants'
import { useYieldPageData } from '~/api/categories/yield/client'
import { useFormatYieldsData } from '~/api/categories/yield'

async function prefetchData() {
	return await arrayFetcher([YIELD_POOLS_API, YIELD_AGGREGATION_API]).then((data) => {
		mutate('/pools-and-aggr', data, false)
		return data
	})
}

// if we are on the browser trigger a prefetch as soon as possible
if (typeof window !== 'undefined') prefetchData()

export default function ApyHomePage() {
	const { data, loading } = useYieldPageData()

	const formattedData = useFormatYieldsData(data, loading)
	return (
		<>
			<Head>
				{/* This will tell the browser to preload the data for our page */}
				<link rel="preload" href="/api/poolsAndAggr" as="fetch" crossOrigin="anonymous" />
			</Head>
			<Layout title={`Yield Rankings - DefiLlama`} defaultSEO>
				<YieldPage loading={loading} {...formattedData} />
			</Layout>
		</>
	)
}
