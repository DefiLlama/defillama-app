import { getProtocolsByChain } from '~/containers/ChainOverview/queries.server'
import { fetchProtocols } from '~/containers/Protocols/api'
import { getNDistinctColors, slug } from '~/utils'
import { fetchForkMetrics, fetchForkProtocolBreakdownChart, fetchForkProtocolChart } from './api'
import { getForkToOriginalTvlPercent } from './tvl'
import type { ForkOverviewPageData, ForkByProtocolPageData } from './types'

// - /forks
export async function getForksListPageData(): Promise<ForkOverviewPageData | null> {
	const [metrics, { protocols: fetchedProtocols }, chartData] = await Promise.all([
		fetchForkMetrics(),
		fetchProtocols(),
		fetchForkProtocolBreakdownChart()
	])

	const forkNames = Object.keys(metrics)

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
	const metrics = await fetchForkMetrics()

	const forkNames = Object.keys(metrics)
	const sortedForkNames = [...forkNames].sort((a, b) => a.localeCompare(b))
	const normalizedFork = fork.toLowerCase()
	const canonicalFork = forkNames.find((f) => slug(f) === normalizedFork || f.toLowerCase() === normalizedFork)

	if (!canonicalFork) {
		return null
	}

	const metadataCache = await import('~/utils/metadata').then((m) => m.default)
	const [chartData, protocolsByChainData] = await Promise.all([
		fetchForkProtocolChart({ protocol: canonicalFork }),
		getProtocolsByChain({
			chain: 'All',
			chainMetadata: metadataCache.chainMetadata,
			protocolMetadata: metadataCache.protocolMetadata,
			fork: canonicalFork
		})
	])
	const protocolTableData = protocolsByChainData?.protocols ?? []

	// Build fork links
	const forkLinks = [{ label: 'All', to: '/forks' }].concat(
		sortedForkNames.map((f) => ({ label: f, to: `/forks/${slug(f)}` }))
	)

	return { fork: canonicalFork, forkLinks, protocolTableData, chartData }
}
