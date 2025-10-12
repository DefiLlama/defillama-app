import { ILineAndBarChartProps } from '~/components/ECharts/types'
import { CHART_API, PROTOCOLS_API } from '~/constants'
import { CHART_COLORS } from '~/constants/colors'
import { getPercentChange, slug, tokenIconUrl } from '~/utils'
import { fetchJson, postRuntimeLogs } from '~/utils/async'
import { ILiteChart, ILiteProtocol } from '../ChainOverview/types'

export interface IPool2ProtocolsTVLByChainPageData {
	protocols: Array<{
		name: string
		logo: string
		slug: string
		category: string | null
		chains: Array<string>
		pool2Tvl: number
		change_1m: number | null
		subRows?: Array<{
			name: string
			logo: string
			slug: string
			category: string | null
			chains: Array<string>
			pool2Tvl: number
			change_1m: number | null
		}>
	}>
	chain: string
	chains: Array<{ label: string; to: string }>
	charts: ILineAndBarChartProps['charts']
	pool2Tvl: number
	change24h: number | null
}

export async function getPool2TVLByChain({
	chain
}: {
	chain: string
}): Promise<IPool2ProtocolsTVLByChainPageData | null> {
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
			.then((data: ILiteChart) => data?.pool2?.map((item) => [+item[0] * 1e3, item[1]]) ?? [])
			.catch((err) => {
				postRuntimeLogs(`Pool2 TVL by Chain: ${chain}: ${err instanceof Error ? err.message : err}`)
				return null
			}),
		fetchJson('https://api.llama.fi/chains2/All').then((data) =>
			data.chainTvls.filter((chain) => (chain.extraTvl?.pool2?.tvl ? true : false)).map((chain) => chain.name)
		)
	])

	if (!chart || chart.length === 0) return null

	const metadataCache = await import('~/utils/metadata').then((m) => m.default)

	const finalProtocols = []
	const finalParentProtocols = {}

	for (const protocol of protocols) {
		let pool2Tvl: number | null = null
		let totalPrevMonth: number | null = null

		for (const ctvl in protocol.chainTvls) {
			if (ctvl.includes('-pool2') && (chain === 'All' ? true : ctvl.split('-')[0] === chain)) {
				pool2Tvl = (pool2Tvl ?? 0) + protocol.chainTvls[ctvl].tvl
				totalPrevMonth = (totalPrevMonth ?? 0) + protocol.chainTvls[ctvl].tvlPrevMonth
			}
		}

		const p = {
			name: protocol.name,
			logo: tokenIconUrl(slug(protocol.name)),
			slug: slug(protocol.name),
			category: protocol.category,
			chains:
				(protocol.defillamaId ? metadataCache.protocolMetadata[protocol.defillamaId]?.chains : null) ??
				protocol.chains ??
				[],
			pool2Tvl,
			totalPrevMonth,
			change_1m:
				totalPrevMonth != null && pool2Tvl != null
					? Number(getPercentChange(pool2Tvl, totalPrevMonth)?.toFixed(2)) || 0
					: null
		}

		if (pool2Tvl != null) {
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
			const pool2Tvl = finalParentProtocols[parent].reduce((acc, curr) => acc + (curr.pool2Tvl ?? 0), 0)
			const totalPrevMonth = finalParentProtocols[parent].reduce((acc, curr) => acc + (curr.totalPrevMonth ?? 0), 0)
			const categories = Array.from(
				new Set(finalParentProtocols[parent].filter((p) => p.category).map((p) => p.category))
			)

			finalProtocols.push({
				name: p.name,
				logo: tokenIconUrl(slug(p.name)),
				slug: slug(p.name),
				category: categories.length > 1 ? null : (categories[0] ?? null),
				chains: Array.from(new Set(finalParentProtocols[parent].map((p) => p.chains).flat())),
				pool2Tvl: finalParentProtocols[parent].reduce((acc, curr) => acc + (curr.pool2Tvl ?? 0), 0),
				totalPrevMonth: finalParentProtocols[parent].reduce((acc, curr) => acc + (curr.totalPrevMonth ?? 0), 0),
				change_1m:
					pool2Tvl != null && totalPrevMonth != null
						? Number(getPercentChange(pool2Tvl, totalPrevMonth)?.toFixed(2)) || 0
						: null,
				subRows: finalParentProtocols[parent]
			})
		}
	}

	return {
		protocols: finalProtocols.sort((a, b) => (b.pool2Tvl ?? 0) - (a.pool2Tvl ?? 0)),
		chain,
		chains: [
			{ label: 'All', to: '/pool2' },
			...chains.map((chain) => ({ label: chain, to: `/pool2/chain/${slug(chain)}` }))
		],
		charts: {
			'Pool2 TVL': { name: 'Pool2 TVL', data: chart, type: 'line', stack: 'Pool2 TVL', color: CHART_COLORS[0] }
		},
		pool2Tvl: chart[chart.length - 1][1],
		change24h:
			chart.length > 2 ? +getPercentChange(chart[chart.length - 1][1], chart[chart.length - 2][1]).toFixed(2) : null
	}
}
