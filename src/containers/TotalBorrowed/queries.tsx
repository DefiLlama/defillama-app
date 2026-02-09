import type { IMultiSeriesChart2Props, MultiSeriesChart2Dataset } from '~/components/ECharts/types'
import { CHART_API, PROTOCOLS_API } from '~/constants'
import { CHART_COLORS } from '~/constants/colors'
import { getPercentChange, slug, tokenIconUrl } from '~/utils'
import { fetchJson, postRuntimeLogs } from '~/utils/async'
import { IProtocolMetadata } from '~/utils/metadata/types'
import { ILiteChart, ILiteProtocol } from '../ChainOverview/types'

export interface ITotalBorrowedByChainPageData {
	protocols: Array<{
		name: string
		logo: string
		slug: string
		category: string | null
		chains: Array<string>
		totalBorrowed: number
		change_1m: number | null
		subRows?: Array<{
			name: string
			logo: string
			slug: string
			category: string | null
			chains: Array<string>
			totalBorrowed: number
			change_1m: number | null
		}>
	}>
	chain: string
	chains: Array<{ label: string; to: string }>
	dataset: MultiSeriesChart2Dataset
	charts: IMultiSeriesChart2Props['charts']
	totalBorrowed: number
	change24h: number | null
}

export async function getTotalBorrowedByChain({
	chain,
	protocolMetadata
}: {
	chain: string
	protocolMetadata: Record<string, IProtocolMetadata>
}): Promise<ITotalBorrowedByChainPageData | null> {
	const [{ protocols, parentProtocols }, chart, chains]: [
		{
			protocols: Array<ILiteProtocol>
			parentProtocols: Array<{ id: string; name: string; chains: Array<string> }>
		},
		Array<[number, number]>,
		Array<string>
	] = await Promise.all([
		fetchJson(PROTOCOLS_API),
		fetchJson(`${CHART_API}${chain && chain !== 'All' ? `/${chain}` : ''}`)
			.then((data: ILiteChart) => data?.borrowed?.map((item) => [+item[0] * 1e3, item[1]]) ?? [])
			.catch((err) => {
				postRuntimeLogs(`Total Borrowed by Chain: ${chain}: ${err instanceof Error ? err.message : err}`)
				return null
			}),
		fetchJson('https://api.llama.fi/chains2/All').then((data) =>
			data.chainTvls.flatMap((chain) => (chain.extraTvl?.borrowed?.tvl ? [chain.name] : []))
		)
	])

	if (!chart || chart.length === 0) return null

	const finalProtocols = []
	const finalParentProtocols = {}

	for (const protocol of protocols) {
		let totalBorrowed: number | null = null
		let totalPrevMonth: number | null = null

		for (const ctvl in protocol.chainTvls) {
			if (ctvl.includes('-borrowed') && (chain === 'All' ? true : ctvl.split('-')[0] === chain)) {
				totalBorrowed = (totalBorrowed ?? 0) + protocol.chainTvls[ctvl].tvl
				totalPrevMonth = (totalPrevMonth ?? 0) + protocol.chainTvls[ctvl].tvlPrevMonth
			}
		}

		const p = {
			name: protocol.name,
			logo: tokenIconUrl(slug(protocol.name)),
			slug: slug(protocol.name),
			category: protocol.category,
			chains: (protocol.defillamaId ? protocolMetadata[protocol.defillamaId]?.chains : null) ?? protocol.chains ?? [],
			totalBorrowed,
			totalPrevMonth,
			change_1m:
				totalPrevMonth != null && totalBorrowed != null
					? Number(getPercentChange(totalBorrowed, totalPrevMonth)?.toFixed(2) ?? 0)
					: null
		}

		if (totalBorrowed != null) {
			if (protocol.parentProtocol) {
				finalParentProtocols[protocol.parentProtocol] = [...(finalParentProtocols[protocol.parentProtocol] ?? []), p]
			} else {
				finalProtocols.push(p)
			}
		}
	}

	for (const parent in finalParentProtocols) {
		const p = parentProtocols.find((p) => p.id === parent)
		if (p) {
			const totalBorrowed = finalParentProtocols[parent].reduce((acc, curr) => acc + (curr.totalBorrowed ?? 0), 0)
			const totalPrevMonth = finalParentProtocols[parent].reduce((acc, curr) => acc + (curr.totalPrevMonth ?? 0), 0)
			const categorySet = new Set<string>()
			for (const p of finalParentProtocols[parent]) {
				if (p.category) categorySet.add(p.category)
			}
			const categories = Array.from(categorySet)

			finalProtocols.push({
				name: p.name,
				logo: tokenIconUrl(slug(p.name)),
				slug: slug(p.name),
				category: categories.length > 1 ? null : (categories[0] ?? null),
				chains: Array.from(new Set(finalParentProtocols[parent].map((p) => p.chains).flat())),
				totalBorrowed: finalParentProtocols[parent].reduce((acc, curr) => acc + (curr.totalBorrowed ?? 0), 0),
				totalPrevMonth: finalParentProtocols[parent].reduce((acc, curr) => acc + (curr.totalPrevMonth ?? 0), 0),
				change_1m:
					totalBorrowed != null && totalPrevMonth != null
						? Number(getPercentChange(totalBorrowed, totalPrevMonth)?.toFixed(2) ?? 0)
						: null,
				subRows: finalParentProtocols[parent]
			})
		}
	}

	return {
		protocols: finalProtocols.sort((a, b) => (b.totalBorrowed ?? 0) - (a.totalBorrowed ?? 0)),
		chain,
		chains: [
			{ label: 'All', to: '/total-borrowed' },
			...chains.map((chain) => ({ label: chain, to: `/total-borrowed/chain/${slug(chain)}` }))
		],
		dataset: {
			source: chart.map(([timestamp, value]) => ({ timestamp, 'Total Borrowed': value })),
			dimensions: ['timestamp', 'Total Borrowed']
		},
		charts: [
			{
				type: 'line' as const,
				name: 'Total Borrowed',
				encode: { x: 'timestamp', y: 'Total Borrowed' },
				color: CHART_COLORS[0],
				stack: 'Total Borrowed'
			}
		],
		totalBorrowed: chart[chart.length - 1][1],
		change24h:
			chart.length > 2 ? +getPercentChange(chart[chart.length - 1][1], chart[chart.length - 2][1]).toFixed(2) : null
	}
}
