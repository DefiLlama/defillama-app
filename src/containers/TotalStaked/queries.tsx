import type { IMultiSeriesChart2Props, MultiSeriesChart2Dataset } from '~/components/ECharts/types'
import { CHART_API, PROTOCOLS_API } from '~/constants'
import { CHART_COLORS } from '~/constants/colors'
import { getPercentChange, slug, tokenIconUrl } from '~/utils'
import { fetchJson, postRuntimeLogs } from '~/utils/async'
import { IProtocolMetadata } from '~/utils/metadata/types'
import { ILiteChart, ILiteProtocol } from '../ChainOverview/types'

export interface ITotalStakedByChainPageData {
	protocols: Array<{
		name: string
		logo: string
		slug: string
		category: string | null
		chains: Array<string>
		totalStaked: number
		change_1m: number | null
		subRows?: Array<{
			name: string
			logo: string
			slug: string
			category: string | null
			chains: Array<string>
			totalStaked: number
			change_1m: number | null
		}>
	}>
	chain: string
	chains: Array<{ label: string; to: string }>
	dataset: MultiSeriesChart2Dataset
	charts: IMultiSeriesChart2Props['charts']
	totalStaked: number
	change24h: number | null
}

export async function getTotalStakedByChain({
	chain,
	protocolMetadata
}: {
	chain: string
	protocolMetadata: Record<string, IProtocolMetadata>
}): Promise<ITotalStakedByChainPageData | null> {
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
			.then((data: ILiteChart) => data?.staking?.map((item) => [+item[0] * 1e3, item[1]]) ?? [])
			.catch((err) => {
				postRuntimeLogs(`Total Staked by Chain: ${chain}: ${err instanceof Error ? err.message : err}`)
				return null
			}),
		fetchJson('https://api.llama.fi/chains2/All').then((data) =>
			data.chainTvls.flatMap((chain) => (chain.extraTvl?.staking?.tvl ? [chain.name] : []))
		)
	])

	if (!chart || chart.length === 0) return null

	const finalProtocols = []
	const finalParentProtocols = {}

	for (const protocol of protocols) {
		let totalStaked: number | null = null
		let totalPrevMonth: number | null = null

		for (const ctvl in protocol.chainTvls) {
			if (ctvl.includes('-staking') && (chain === 'All' ? true : ctvl.split('-')[0] === chain)) {
				totalStaked = (totalStaked ?? 0) + protocol.chainTvls[ctvl].tvl
				totalPrevMonth = (totalPrevMonth ?? 0) + protocol.chainTvls[ctvl].tvlPrevMonth
			}
		}

		const p = {
			name: protocol.name,
			logo: tokenIconUrl(slug(protocol.name)),
			slug: slug(protocol.name),
			category: protocol.category,
			chains: (protocol.defillamaId ? protocolMetadata[protocol.defillamaId]?.chains : null) ?? protocol.chains ?? [],
			totalStaked,
			totalPrevMonth,
			change_1m:
				totalPrevMonth != null && totalStaked != null
					? Number(getPercentChange(totalStaked, totalPrevMonth)?.toFixed(2) ?? 0)
					: null
		}

		if (totalStaked != null) {
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
			const totalStaked = finalParentProtocols[parent].reduce((acc, curr) => acc + (curr.totalStaked ?? 0), 0)
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
				totalStaked: finalParentProtocols[parent].reduce((acc, curr) => acc + (curr.totalStaked ?? 0), 0),
				totalPrevMonth: finalParentProtocols[parent].reduce((acc, curr) => acc + (curr.totalPrevMonth ?? 0), 0),
				change_1m:
					totalStaked != null && totalPrevMonth != null
						? Number(getPercentChange(totalStaked, totalPrevMonth)?.toFixed(2) ?? 0)
						: null,
				subRows: finalParentProtocols[parent]
			})
		}
	}

	return {
		protocols: finalProtocols.sort((a, b) => (b.totalStaked ?? 0) - (a.totalStaked ?? 0)),
		chain,
		chains: [
			{ label: 'All', to: '/total-staked' },
			...chains.map((chain) => ({ label: chain, to: `/total-staked/chain/${slug(chain)}` }))
		],
		dataset: {
			source: chart.map(([timestamp, value]) => ({ timestamp, 'Total Staked': value })),
			dimensions: ['timestamp', 'Total Staked']
		},
		charts: [
			{
				type: 'line' as const,
				name: 'Total Staked',
				encode: { x: 'timestamp', y: 'Total Staked' },
				color: CHART_COLORS[0],
				stack: 'Total Staked'
			}
		],
		totalStaked: chart[chart.length - 1][1],
		change24h:
			chart.length > 2 ? +getPercentChange(chart[chart.length - 1][1], chart[chart.length - 2][1]).toFixed(2) : null
	}
}
