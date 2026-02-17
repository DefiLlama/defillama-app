import { PROTOCOLS_API } from '~/constants'
import type { ILiteProtocol } from '~/containers/ChainOverview/types'
import { toStrikeTvl } from '~/containers/ChainOverview/utils'
import { getNDistinctColors, slug } from '~/utils'
import { fetchJson } from '~/utils/async'
import { fetchForkMetrics, fetchForkProtocolBreakdownChart, fetchForkProtocolChart } from './api'
import { getForkToOriginalTvlPercent } from './tvl'
import type { ForkOverviewPageData, ForkByProtocolPageData } from './types'

type TProtocolsApiResponse = {
	protocols: Array<ILiteProtocol>
}

// - /forks
export async function getForksListPageData(): Promise<ForkOverviewPageData | null> {
	const [metrics, { protocols: fetchedProtocols }] = await Promise.all([
		fetchForkMetrics(),
		fetchJson<TProtocolsApiResponse>(PROTOCOLS_API)
	])

	const forkNames = Object.keys(metrics)
	const chartData = await fetchForkProtocolBreakdownChart()

	// Get latest TVL by fork from the last chart data point
	const latestTvlByFork: Record<string, number> = {}
	if (chartData.length > 0) {
		const lastDay = chartData[chartData.length - 1]
		for (const key in lastDay) {
			if (key !== 'timestamp') {
				latestTvlByFork[key] = lastDay[key]
			}
		}
	}

	// Sort forks by TVL
	const sortedForks = forkNames.sort((a, b) => (latestTvlByFork[b] ?? 0) - (latestTvlByFork[a] ?? 0))

	// Get fork colors
	const forkColors: Record<string, string> = { Others: '#AAAAAA' }
	const sortedColors = getNDistinctColors(sortedForks.length)
	sortedForks.forEach((fork, i) => {
		forkColors[fork] = sortedColors[i]
	})

	// Build table data
	const protocolsByName = new Map(fetchedProtocols.map((p) => [p.name, p]))
	const tableData = sortedForks.map((forkName) => {
		const forkedProtocols = metrics[forkName]?.length ?? 0
		const tvl = latestTvlByFork[forkName] ?? 0
		const parentProtocol = protocolsByName.get(forkName)
		const parentTvl = parentProtocol?.tvl
		const ftot = getForkToOriginalTvlPercent(tvl, parentTvl)

		return { name: forkName, tvl, forkedProtocols, parentTvl: parentTvl ?? null, ftot }
	})

	// Build fork links
	const forkLinks = [{ label: 'All', to: '/forks' }].concat(
		sortedForks.map((f) => ({ label: f, to: `/forks/${slug(f)}` }))
	)

	return { forks: sortedForks, forkLinks, forkColors, tableData, chartData }
}

// - /forks/:fork
export async function getForksByProtocolPageData({ fork }: { fork: string }): Promise<ForkByProtocolPageData | null> {
	const [metrics, { protocols: fetchedProtocols }] = await Promise.all([
		fetchForkMetrics(),
		fetchJson<TProtocolsApiResponse>(PROTOCOLS_API)
	])

	const forkNames = Object.keys(metrics)
	const normalizedFork = fork.toLowerCase()
	const canonicalFork = forkNames.find((f) => slug(f) === normalizedFork || f.toLowerCase() === normalizedFork)

	if (!canonicalFork) {
		return null
	}

	// Fetch chart data for this specific fork - returns [timestamp, value] tuples
	const chartData = await fetchForkProtocolChart({ protocol: canonicalFork })

	// Build protocol table data
	const protocolsByName = new Map(fetchedProtocols.map((p) => [p.name, p]))
	const forkedProtocolNames = metrics[canonicalFork] ?? []
	const protocolTableData = forkedProtocolNames
		.map((name) => {
			const protocol = protocolsByName.get(name)
			if (!protocol) return null
			return {
				...protocol,
				strikeTvl: toStrikeTvl(protocol, { liquidstaking: false, doublecounted: false })
			}
		})
		.filter((p): p is NonNullable<typeof p> => p != null)
		.sort((a, b) => b.tvl - a.tvl)

	// Build fork links
	const forkLinks = [{ label: 'All', to: '/forks' }].concat(
		forkNames.map((f) => ({ label: f, to: `/forks/${slug(f)}` }))
	)

	return { fork: canonicalFork, forkLinks, protocolTableData, chartData }
}
