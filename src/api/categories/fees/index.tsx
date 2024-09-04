import { DIMENISIONS_OVERVIEW_API, DIMENISIONS_SUMMARY_BASE_API } from '~/constants'
import { fetchOverCache } from '~/utils/perf'

// - used in /fees and /fees/chain/[chain]
export const getFeesAndRevenueByChain = async ({
	chain,
	excludeTotalDataChart,
	excludeTotalDataChartBreakdown
}: {
	chain?: string
	excludeTotalDataChart: boolean
	excludeTotalDataChartBreakdown: boolean
}) => {
	const apiUrl = `${DIMENISIONS_SUMMARY_BASE_API}/fees${
		chain && chain !== 'All' ? '/' + chain : ''
	}?excludeTotalDataChart=${excludeTotalDataChart}&excludeTotalDataChartBreakdown=${excludeTotalDataChartBreakdown}`

	const [fees, revenue] = await Promise.all([
		fetchOverCache(apiUrl)
			.then((res) => {
				if (res.status === 200) {
					return res.json()
				} else {
					return null
				}
			})
			.catch((err) => {
				console.log('Error at ', apiUrl, err)
				return null
			}),
		fetchOverCache(`${apiUrl}&dataType=dailyRevenue`)
			.then((res) => {
				if (res.status === 200) {
					return res.json()
				} else {
					return null
				}
			})
			.catch((err) => {
				console.log('Error at ', apiUrl + '&dataType=dailyRevenue', err)
				return null
			})
	])

	return { fees, revenue }
}

// - used in /fees and /fees/chain/[chain]
export const getFeesAndRevenueProtocolsByChain = async ({ chain }: { chain?: string }) => {
	const apiUrl = `${DIMENISIONS_OVERVIEW_API}/fees${
		chain && chain !== 'All' ? '/' + chain : ''
	}?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true`

	const [fees, revenue] = await Promise.all([
		fetchOverCache(apiUrl)
			.then((res) => {
				if (res.status === 200) {
					return res.json()
				} else {
					return null
				}
			})
			.catch((err) => {
				console.log('Error at ', apiUrl, err)
				return null
			}),
		fetchOverCache(`${apiUrl}&dataType=dailyRevenue`)
			.then((res) => {
				if (res.status === 200) {
					return res.json()
				} else {
					return null
				}
			})
			.catch((err) => {
				console.log('Error at ', apiUrl + '&dataType=dailyRevenue', err)
				return null
			})
	])

	const revenueProtocols =
		revenue?.protocols?.reduce((acc, protocol) => ({ ...acc, [protocol.name]: protocol }), {}) ?? {}

	// TODO: fix missing parent protocols fees and revenue
	return (
		fees?.protocols?.map((protocol) => ({
			...protocol,
			category: protocol.category,
			displayName: protocol.displayName ?? protocol.name,
			revenue24h: revenueProtocols?.[protocol.name]?.total24h ?? null,
			revenue7d: revenueProtocols?.[protocol.name]?.total7d ?? null,
			revenue30d: revenueProtocols?.[protocol.name]?.total30d ?? null
		})) ?? []
	)
}
