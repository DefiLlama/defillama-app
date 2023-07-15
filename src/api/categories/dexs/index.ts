import { fetchOverCache } from '~/utils/perf'

// - used in /dexs and /dexs/chain/[chain]
export const getDexVolumeByChain = async ({
	chain,
	excludeTotalDataChart,
	excludeTotalDataChartBreakdown
}: {
	chain?: string
	excludeTotalDataChart: boolean
	excludeTotalDataChartBreakdown: boolean
}) => {
	const data = await fetchOverCache(
		`https://api.llama.fi/overview/dexs${
			chain && chain !== 'All' ? '/' + chain : ''
		}?excludeTotalDataChart=${excludeTotalDataChart}&excludeTotalDataChartBreakdown=${excludeTotalDataChartBreakdown}`
	)
		.then((res) => {
			if (res.status === 200) {
				return res.json()
			} else {
				return null
			}
		})
		.catch((err) => {
			console.log(err)
			return null
		})

	return data
}
