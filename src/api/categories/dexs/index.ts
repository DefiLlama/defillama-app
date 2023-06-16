import { fetchWithErrorLogging } from '~/utils/async'

const fetch = fetchWithErrorLogging

// - used in /dexs and /dexs/chain/[chaoin]
export const getDexVolumeByChain = async ({
	chain,
	excludeTotalDataChart,
	excludeTotalDataChartBreakdown
}: {
	chain?: string
	excludeTotalDataChart: boolean
	excludeTotalDataChartBreakdown: boolean
}) => {
	const data = await fetch(
		`https://api.llama.fi/overview/dexs${
			chain && chain !== 'All' ? '/' + chain : ''
		}?excludeTotalDataChart=${excludeTotalDataChart}&excludeTotalDataChartBreakdown=${excludeTotalDataChartBreakdown}`
	)
		.then((res) => res.json())
		.catch((err) => {
			console.log(err)
			return {}
		})

	return data
}
