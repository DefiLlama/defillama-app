import { getProtocolsByChain } from '~/containers/ChainOverview/queries.server'
import { fetchProtocols } from '~/containers/Protocols/api'
import { getNDistinctColors, slug } from '~/utils'
import { fetchForkMetrics, fetchForkProtocolBreakdownChart, fetchForkProtocolChart } from './api'
import { getForkToOriginalTvlPercent } from './tvl'
import type { ForkOverviewPageData, ForkByProtocolPageData } from './types'

function sortForksByLatestTvl(forkNames: string[], chartData: unknown): string[] {
	const latestTvlByFork: Record<string, number> = {}
	if (Array.isArray(chartData) && chartData.length > 0) {
		const lastDay = chartData[chartData.length - 1]
		for (const key in lastDay) {
			if (key !== 'timestamp') {
				latestTvlByFork[key] = lastDay[key]
			}
		}
	}

	return [...forkNames].sort((a, b) => (latestTvlByFork[b] ?? 0) - (latestTvlByFork[a] ?? 0))
}

// - /forks
export async function getForksListPageData(): Promise<ForkOverviewPageData | null> {
	try {
		const [metrics, { protocols: fetchedProtocols }, chartData] = await Promise.all([
			fetchForkMetrics(),
			fetchProtocols(),
			fetchForkProtocolBreakdownChart()
		])

		const forkNames = Object.keys(metrics)
		const sortedForks = sortForksByLatestTvl(forkNames, chartData)

		const latestTvlByFork: Record<string, number> = {}
		if (Array.isArray(chartData) && chartData.length > 0) {
			const lastDay = chartData[chartData.length - 1]
			for (const key in lastDay) {
				if (key !== 'timestamp') {
					latestTvlByFork[key] = lastDay[key]
				}
			}
		}

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

		return { forks: sortedForks, forkLinks, forkColors, tableData, chartData: Array.isArray(chartData) ? chartData : [] }
	} catch (error) {
		console.error('Error fetching forks list page data', error)
		return null
	}
}

// - /forks/:fork
export async function getForksByProtocolPageData({ fork }: { fork: string }): Promise<ForkByProtocolPageData | null> {
	try {
		const metrics = await fetchForkMetrics()
		const forkNames = Object.keys(metrics)
		const normalizedFork = fork.toLowerCase()
		const canonicalFork = forkNames.find((f) => slug(f) === normalizedFork || f.toLowerCase() === normalizedFork)

		if (!canonicalFork) {
			return null
		}

		const metadataCache = await import('~/utils/metadata').then((m) => m.default)
		const [chartData, protocolsByChainData, forkBreakdownChartData] = await Promise.all([
			fetchForkProtocolChart({ protocol: canonicalFork }),
			getProtocolsByChain({
				chain: 'All',
				chainMetadata: metadataCache.chainMetadata,
				protocolMetadata: metadataCache.protocolMetadata,
				fork: canonicalFork
			}),
			fetchForkProtocolBreakdownChart()
		])
		const protocolTableData = protocolsByChainData?.protocols ?? []

		// Build fork links with same TVL ordering as overview page
		const sortedForks = sortForksByLatestTvl(forkNames, forkBreakdownChartData)
		const forkLinks = [{ label: 'All', to: '/forks' }].concat(
			sortedForks.map((f) => ({ label: f, to: `/forks/${slug(f)}` }))
		)

		return { fork: canonicalFork, forkLinks, protocolTableData, chartData }
	} catch (error) {
		console.error('Error fetching fork details page data', error)
		return null
	}
}
