import { DIMENISIONS_OVERVIEW_API, DIMENISIONS_SUMMARY_BASE_API } from '~/constants'
import { fetchWithErrorLogging } from '~/utils/async'

interface Protocol {
	category: string | null
	total24h?: number
}

type RevenuesResponse = {
	protocols: Protocol[]
}

type AggregatedRevenues = Record<string, number>

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
		fetchWithErrorLogging(apiUrl)
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
		fetchWithErrorLogging(`${apiUrl}&dataType=dailyRevenue`)
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

export const getAppRevenueByChain = async ({
	chain,
	excludeTotalDataChartBreakdown
}: {
	chain?: string
	excludeTotalDataChartBreakdown: boolean
}) => {
	const protocolsToExclude = ['Tether', 'Circle', 'bloXroute'].concat(chain ? [chain] : [])
	const apiUrl = `${DIMENISIONS_OVERVIEW_API}/fees${
		chain && chain !== 'All' ? '/' + chain : ''
	}?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=${excludeTotalDataChartBreakdown}&dataType=dailyRevenue`

	const revenue = await fetchWithErrorLogging(apiUrl)
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
		})

	const chart =
		revenue?.totalDataChartBreakdown?.reduce((acc, curr) => {
			let rev = 0
			for (const protocol in curr[1]) {
				if (!protocolsToExclude.includes(protocol)) {
					rev += curr[1][protocol]
				}
			}
			acc = [...acc, [curr[0], rev]]
			return acc
		}, []) ?? []

	return {
		appRevenue24h: revenue
			? revenue.protocols.reduce((acc, curr) => {
					if (!protocolsToExclude.includes(curr.name)) {
						acc += curr.total24h || 0
					}
					return acc
			  }, 0)
			: null,
		chart
	}
}

// - used in /fees and /fees/chain/[chain]
export const getFeesAndRevenueProtocolsByChain = async ({ chain }: { chain?: string }) => {
	const apiUrl = `${DIMENISIONS_OVERVIEW_API}/fees${
		chain && chain !== 'All' ? '/' + chain : ''
	}?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true`

	const [fees, revenue] = await Promise.all([
		fetchWithErrorLogging(apiUrl)
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
		fetchWithErrorLogging(`${apiUrl}&dataType=dailyRevenue`)
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

// - used in /categories
export const getRevenuesByCategories = async (): Promise<AggregatedRevenues> => {
	const apiUrl = `${DIMENISIONS_OVERVIEW_API}/fees/all?dataType=dailyRevenue&excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true`

	const revenues: RevenuesResponse | null = await fetchWithErrorLogging(apiUrl)
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
		})

	return revenues.protocols.reduce((acc: AggregatedRevenues, protocol: Protocol) => {
		const { category, total24h } = protocol
		// Filter to ignore negative or abnormally high values
		if (!category || !total24h || total24h < 0 || total24h > 10e9) {
			return acc
		}

		if (!acc[category]) {
			acc[category] = 0
		}

		acc[category] += Number(total24h)
		return acc
	}, {})
}
