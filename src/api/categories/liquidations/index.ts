import { YIELD_CONFIG_API, YIELD_POOLS_API } from '~/constants'
import { arrayFetcher } from '~/utils/useSWR'
import { formatYieldsPageData } from './utils'

export async function getLiquidationsPageData() {
	let poolsAndConfig = await arrayFetcher([YIELD_POOLS_API, YIELD_CONFIG_API])

	const data = formatYieldsPageData(poolsAndConfig)

	return {
		props: data
	}
}
