import { YIELD_CONFIG_API, YIELD_POOLS_API, YIELD_MEDIAN_API } from '~/constants'
import { arrayFetcher } from '~/utils/useSWR'
import { formatYieldsPageData } from './utils'

export async function getYieldPageData() {
	let poolsAndConfig = await arrayFetcher([YIELD_POOLS_API, YIELD_CONFIG_API])

	const data = formatYieldsPageData(poolsAndConfig)

	return {
		props: data
	}
}

export async function getYieldMedianData() {
	const data = await arrayFetcher([YIELD_MEDIAN_API])

	return {
		props: data[0].data
	}
}
