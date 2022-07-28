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
	let data = (await arrayFetcher([YIELD_MEDIAN_API]))[0].data
	// for the 4th of june we have low nb of datapoints which is skewing the median/
	// hence why we remove it from the plot
	data = data.filter((p) => p.timestamp !== '2022-06-04T00:00:00.000Z')

	// add 7day average field
	data = data
		.map((e) => ({ ...e, timestamp: e.timestamp.split('T')[0] }))
		.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
	// add rolling 7d avg of median values (first 6days == null)
	const windowSize = 7
	const apyMedianValues = data.map((m) => m.medianAPY)
	const avg = []
	for (let i = 0; i < apyMedianValues.length; i++) {
		if (i + 1 < windowSize) {
			avg[i] = null
		} else {
			avg[i] = apyMedianValues.slice(i + 1 - windowSize, i + 1).reduce((a, b) => a + b, 0) / windowSize
		}
	}
	data = data.map((m, i) => ({ ...m, avg7day: avg[i] }))

	return {
		props: data
	}
}
