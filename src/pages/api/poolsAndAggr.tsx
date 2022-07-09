import { YIELD_AGGREGATION_API, YIELD_POOLS_API } from '~/constants'
import { arrayFetcher } from '~/utils/useSWR'

export default async function handler() {
	// Get data from your database
	const data = await arrayFetcher([YIELD_POOLS_API, YIELD_AGGREGATION_API])

	return { data: data ? { pools: data[0]?.data ?? [], aggregations: data[1]?.data ?? [] } : null }
}
