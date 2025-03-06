import { DIMENISIONS_OVERVIEW_API, DIMENISIONS_SUMMARY_BASE_API, EMISSION_BREAKDOWN_API } from '~/constants'
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
	const apiUrl =
		chain && chain !== 'All'
			? `${DIMENISIONS_SUMMARY_BASE_API}/fees/${chain}?excludeTotalDataChart=${excludeTotalDataChart}&excludeTotalDataChartBreakdown=${excludeTotalDataChartBreakdown}`
			: null

	const [fees, revenue] = await Promise.all([
		apiUrl
			? fetchWithErrorLogging(apiUrl)
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
			: null,
		apiUrl
			? fetchWithErrorLogging(`${apiUrl}&dataType=dailyRevenue`)
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
			: null
	])

	return { fees, revenue }
}

export const getAppRevenueByChain = async ({
	chain,
	excludeTotalDataChart = true,
	excludeTotalDataChartBreakdown = true
}: {
	chain?: string
	excludeTotalDataChart?: boolean
	excludeTotalDataChartBreakdown?: boolean
}) => {
	const apiUrl = `${DIMENISIONS_OVERVIEW_API}/fees${
		chain && chain !== 'All' ? '/' + chain : ''
	}?excludeTotalDataChart=${excludeTotalDataChart}&excludeTotalDataChartBreakdown=${excludeTotalDataChartBreakdown}&dataType=dailyAppRevenue`

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

	return {
		totalAppRevenue24h: revenue?.total24h ?? null,
		totalDataChart: revenue?.totalDataChart ?? [],
		protocols: revenue?.protocols ?? [],
		chain
	}
}

// - used in /fees and /fees/chain/[chain]
export const getFeesAndRevenueProtocolsByChain = async ({ chain }: { chain?: string }) => {
	const apiUrl = `${DIMENISIONS_OVERVIEW_API}/fees${
		chain && chain !== 'All' ? '/' + chain : ''
	}?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true`

	const [fees, revenue, emissionBreakdown, bribesRevenue, holdersRevenue] = await Promise.all([
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
			.then((res) => {
				return (
					res?.protocols?.reduce((acc, protocol) => {
						if (protocol.category !== 'Chain') {
							acc = { ...acc, [protocol.name]: protocol }
						}
						return acc
					}, {}) ?? {}
				)
			})
			.catch((err) => {
				console.log('Error at ', apiUrl + '&dataType=dailyRevenue', err)
				return null
			}),
		fetch(EMISSION_BREAKDOWN_API)
			.then((res) => {
				if (res.status === 200) {
					return res.json()
				} else {
					return null
				}
			})
			.catch((err) => {
				console.log('Error at ', EMISSION_BREAKDOWN_API, err)
				return null
			}),
		fetchWithErrorLogging(`${apiUrl}&dataType=dailyBribesRevenue`)
			.then((res) => {
				if (res.status === 200) {
					return res.json()
				} else {
					return null
				}
			})
			.then((res) => {
				return (
					res?.protocols?.reduce((acc, protocol) => {
						if (protocol.category !== 'Chain') {
							acc = { ...acc, [protocol.name]: protocol }
						}
						return acc
					}, {}) ?? {}
				)
			})
			.catch((err) => {
				console.log('Error at ', apiUrl + '&dataType=dailyBribesRevenue', err)
				return null
			}),
		fetchWithErrorLogging(`${apiUrl}&dataType=dailyHoldersRevenue`)
			.then((res) => {
				if (res.status === 200) {
					return res.json()
				} else {
					return null
				}
			})
			.then((res) => {
				return (
					res?.protocols?.reduce((acc, protocol) => {
						if (protocol.category !== 'Chain') {
							acc = { ...acc, [protocol.name]: protocol }
						}
						return acc
					}, {}) ?? {}
				)
			})
			.catch((err) => {
				console.log('Error at ', apiUrl + '&dataType=dailyHoldersRevenue', err)
				return null
			})
	])

	// TODO: fix missing parent protocols fees and revenue
	return (
		fees?.protocols?.reduce((acc, protocol) => {
			if (protocol.category !== 'Chain') {
				acc = [
					...acc,
					{
						...protocol,
						category: protocol.category,
						displayName: protocol.displayName ?? protocol.name,
						revenue24h: revenue?.[protocol.name]?.total24h ?? null,
						revenue7d: revenue?.[protocol.name]?.total7d ?? null,
						revenue30d: revenue?.[protocol.name]?.total30d ?? null,
						revenue1y: revenue?.[protocol.name]?.total1y ?? null,
						averageRevenue1y: revenue?.[protocol.name]?.average1y ?? null,
						holdersRevenue24h: holdersRevenue?.[protocol.name]?.total24h ?? null,
						holdersRevenue30d: holdersRevenue?.[protocol.name]?.total30d ?? null
					}
				]
			}

			return acc
		}, []) ?? []
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
