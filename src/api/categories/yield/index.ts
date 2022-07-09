import { YIELD_AGGREGATION_API, YIELD_POOLS_API } from '~/constants'
import { arrayFetcher } from '~/utils/useSWR'
import { formatYieldsPageData } from './utils'

export async function getYieldPageData() {
	try {
		let poolsAndAggr = await arrayFetcher([YIELD_POOLS_API, YIELD_AGGREGATION_API])

		const data = formatYieldsPageData(poolsAndAggr)

		return {
			props: {
				...data
			}
		}
	} catch (e) {
		console.log(e)
		return {
			notFound: true
		}
	}
}
