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
	const apiUrl = `https://api.llama.fi/summary/fees${
		chain && chain !== 'All' ? '/' + chain : ''
	}?excludeTotalDataChart=${excludeTotalDataChart}&excludeTotalDataChartBreakdown=${excludeTotalDataChartBreakdown}`

	const [fees, revenue] = await Promise.all([
		fetch(apiUrl)
			.then((res) => res.json())
			.catch((err) => {
				// console.log('Error at ', apiUrl, err)
				return {}
			}),
		fetch(`${apiUrl}&dataType=dailyRevenue`)
			.then((res) => res.json())
			.catch((err) => {
				// console.log('Error at ', apiUrl + '&dataType=dailyRevenue', err)
				return {}
			})
	])

	return { fees, revenue }
}

// - used in /fees and /fees/chain/[chain]
export const getFeesAndRevenueProtocolsByChain = async ({ chain }: { chain?: string }) => {
	const apiUrl = `https://api.llama.fi/overview/fees${
		chain && chain !== 'All' ? '/' + chain : ''
	}?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true`

	const [fees, revenue] = await Promise.all([
		fetch(apiUrl)
			.then((res) => res.json())
			.catch((err) => {
				// console.log('Error at ', apiUrl, err)
				return {}
			}),
		fetch(`${apiUrl}&dataType=dailyRevenue`)
			.then((res) => res.json())
			.catch((err) => {
				// console.log('Error at ', apiUrl + '&dataType=dailyRevenue', err)
				return {}
			})
	])

	const revenueProtocols =
		revenue?.protocols?.reduce((acc, protocol) => ({ ...acc, [protocol.name]: protocol }), {}) ?? {}

	// TODO: fix missing parent protocols fees and revenue
	return (
		fees.protocols?.map((protocol) => ({
			...protocol,
			category: protocol.category,
			displayName: protocol.displayName ?? protocol.name,
			revenue24h: revenueProtocols?.[protocol.name]?.total24h ?? null,
			revenue7d: revenueProtocols?.[protocol.name]?.total7d ?? null,
			revenue30d: revenueProtocols?.[protocol.name]?.total30d ?? null
		})) ?? []
	)
}
