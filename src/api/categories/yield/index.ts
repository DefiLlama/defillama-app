import { YIELD_POOLS_API } from '~/constants'
import { arrayFetcher } from '~/utils/useSWR'
import { formatYieldsPageData } from './utils'

export async function getYieldPageData() {
	try {
		let pools = await arrayFetcher([YIELD_POOLS_API])

		const data = formatYieldsPageData(pools)

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
