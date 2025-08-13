import { CHART_API, PROTOCOLS_API } from '~/constants'
import { fetchJson, postRuntimeLogs } from '~/utils/async'
import { ILiteChart, ILiteProtocol } from '../ChainOverview/types'
import { oldBlue } from '~/constants/colors'
import { ILineAndBarChartProps } from '~/components/ECharts/types'
import { getPercentChange, slug, tokenIconUrl } from '~/utils'

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
	charts: ILineAndBarChartProps['charts']
	totalStaked: number
	change24h: number | null
}

export async function getTotalStakedByChain({ chain }: { chain: string }): Promise<ITotalStakedByChainPageData | null> {
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
			data.chainTvls.filter((chain) => (chain.extraTvl?.staking?.tvl ? true : false)).map((chain) => chain.name)
		)
	])

	if (!chart || chart.length === 0) return null

	const metadataCache = await import('~/utils/metadata').then((m) => m.default)

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
			chains:
				(protocol.defillamaId ? metadataCache.protocolMetadata[protocol.defillamaId].chains : null) ??
				protocol.chains ??
				[],
			totalStaked,
			totalPrevMonth,
			change_1m:
				totalPrevMonth != null && totalStaked != null
					? (getPercentChange(totalStaked, totalPrevMonth)?.toFixed(2) ?? 0)
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
			const categories = Array.from(
				new Set(finalParentProtocols[parent].filter((p) => p.category).map((p) => p.category))
			)

			finalProtocols.push({
				name: p.name,
				logo: tokenIconUrl(slug(p.name)),
				slug: slug(p.name),
				category: categories.length > 1 ? null : (categories[0] ?? null),
				chains: Array.from(new Set(finalParentProtocols[parent].map((p) => p.chains).flat())),
				totalStaked: finalParentProtocols[parent].reduce((acc, curr) => acc + (curr.totalStaked ?? 0), 0),
				totalPrevMonth: finalParentProtocols[parent].reduce((acc, curr) => acc + (curr.totalPrevMonth ?? 0), 0),
				change_1m:
					totalPrevMonth != null && totalPrevMonth != null
						? (getPercentChange(totalStaked, totalPrevMonth)?.toFixed(2) ?? 0)
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
		charts: {
			'Total Staked': { name: 'Total Staked', data: chart, type: 'line', stack: 'Total Staked', color: oldBlue }
		},
		totalStaked: chart[chart.length - 1][1],
		change24h:
			chart.length > 2 ? +getPercentChange(chart[chart.length - 1][1], chart[chart.length - 2][1]).toFixed(2) : null
	}
}
