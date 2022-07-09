import { mutate } from 'swr'
import Layout from '~/layout'
import YieldPage from '~/components/YieldsPage'
import { useYieldPageData } from '~/api/categories/yield/client'
import { useFormatYieldsData } from '~/api/categories/yield'
import { arrayFetcher } from '~/utils/useSWR'
import { YIELD_AGGREGATION_API, YIELD_POOLS_API } from '~/constants'

async function prefetchData() {
	return await arrayFetcher([YIELD_POOLS_API, YIELD_AGGREGATION_API]).then((data) => {
		mutate('/pools-and-aggr', data, false)
	})
}

// if we are on the browser trigger a prefetch as soon as possible
if (typeof window !== 'undefined') prefetchData()

export default function ApyHomePage() {
	const { data, loading } = useYieldPageData()

	const formattedData = useFormatYieldsData(data, loading)

	return (
		<Layout title={`Yield Rankings - DefiLlama`} defaultSEO>
			<YieldPage loading={loading} {...formattedData} />
		</Layout>
	)
}
