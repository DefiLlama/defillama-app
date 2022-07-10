import { CONFIG_API, YIELD_POOLS_API } from '~/constants'
import { arrayFetcher } from '~/utils/useSWR'
import { formatYieldsPageData } from './utils'

export async function getYieldPageData() {
	try {
		let poolsAndConfig = await arrayFetcher([YIELD_POOLS_API, CONFIG_API])

		const data = formatYieldsPageData(poolsAndConfig)

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
