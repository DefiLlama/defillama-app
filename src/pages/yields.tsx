import { mutate } from 'swr'
import Layout from '~/layout'
import YieldPage from '~/components/YieldsPage'
import { useYieldPageData } from '~/api/categories/yield/client'
import { arrayFetcher } from '~/utils/useSWR'
import { YIELD_AGGREGATION_API, YIELD_POOLS_API } from '~/constants'
import { useMemo } from 'react'
import { formatYieldsPageData } from '~/api/categories/yield/utils'

async function prefetchData() {
	return await arrayFetcher([YIELD_POOLS_API, YIELD_AGGREGATION_API]).then((data) => {
		mutate('/pools-and-aggr', data, false)
	})
}

// if we are on the browser trigger a prefetch as soon as possible
if (typeof window !== 'undefined') prefetchData()

export default function ApyHomePage() {
	const { data, loading } = useYieldPageData()

	const formattedData = useMemo(() => {
		if (loading || !data) return { pools: [], chainList: [], projectList: [] }
		return formatYieldsPageData(data)
	}, [loading, data])

	return (
		<Layout title={`Yield Rankings - DefiLlama`} defaultSEO>
			<YieldPage loading={loading} {...formattedData} />
		</Layout>
	)
}
