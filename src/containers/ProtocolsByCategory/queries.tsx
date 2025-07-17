import { CATEGORY_API, CHART_API, PROTOCOLS_API } from '~/constants'
import { fetchJson } from '~/utils/async'
import { getAdapterChainOverview, IAdapterOverview } from '../DimensionAdapters/queries'
import { DEFI_SETTINGS_KEYS } from '~/contexts/LocalStorage'
import { ILiteParentProtocol, ILiteProtocol } from '../ChainOverview/types'
import { IProtocolByCategoryPageData } from './types'
import { slug, tokenIconUrl } from '~/utils'
import { oldBlue } from '~/constants/colors'
import { tvlOptions } from '~/components/Filters/options'

const extraTvlOptions = tvlOptions.filter((o) => !['doublecounted', 'liquidstaking'].includes(o.key)).map((o) => o.key)

export async function getProtocolsByCategory({
	category,
	chain
}: {
	category: string
	chain?: string
}): Promise<IProtocolByCategoryPageData> {
	const [
		{ protocols, parentProtocols },
		feesData,
		revenueData,
		dexVolumeData,
		perpVolumeData,
		tvlByCategories,
		tvlOnAllChains
	]: [
		{ protocols: Array<ILiteProtocol>; parentProtocols: Array<ILiteParentProtocol> },
		IAdapterOverview | null,
		IAdapterOverview | null,
		IAdapterOverview | null,
		IAdapterOverview | null,
		Record<string, Array<[string, number]>>,
		{ chart: Record<string, Record<string, { tvl: number }>> }
	] = await Promise.all([
		fetchJson(PROTOCOLS_API),
		getAdapterChainOverview({
			chain: chain ?? 'All',
			adapterType: 'fees',
			excludeTotalDataChart: true,
			excludeTotalDataChartBreakdown: true
		}),
		getAdapterChainOverview({
			chain: chain ?? 'All',
			adapterType: 'fees',
			dataType: 'dailyRevenue',
			excludeTotalDataChart: true,
			excludeTotalDataChartBreakdown: true
		}),
		getAdapterChainOverview({
			chain: chain ?? 'All',
			adapterType: 'dexs',
			excludeTotalDataChart: true,
			excludeTotalDataChartBreakdown: true
		}),
		getAdapterChainOverview({
			chain: chain ?? 'All',
			adapterType: 'derivatives',
			excludeTotalDataChart: true,
			excludeTotalDataChartBreakdown: true
		}),
		fetchJson(`${CHART_API}/categories/${category.toLowerCase().replace(' ', '_')}`),
		fetchJson(`${CATEGORY_API}`)
	])

	const chains = []
	for (const chain in tvlByCategories) {
		chains.push([chain, tvlByCategories[chain].at(-1)?.[1] ?? 0])
	}

	const adapterDataStore = {}
	for (const protocol of feesData?.protocols ?? []) {
		if (!adapterDataStore[protocol.defillamaId]) {
			adapterDataStore[protocol.defillamaId] = {
				chains: protocol.chains
			}
		}
		adapterDataStore[protocol.defillamaId].fees = {
			total24h: protocol.total24h ?? null,
			total7d: protocol.total7d ?? null,
			total30d: protocol.total30d ?? null
		}
	}
	for (const protocol of revenueData?.protocols ?? []) {
		if (!adapterDataStore[protocol.defillamaId]) {
			adapterDataStore[protocol.defillamaId] = {
				chains: protocol.chains
			}
		}
		adapterDataStore[protocol.defillamaId].revenue = {
			total24h: protocol.total24h ?? null,
			total7d: protocol.total7d ?? null,
			total30d: protocol.total30d ?? null,
			chains: Array.from(new Set([...adapterDataStore[protocol.defillamaId].chains, ...protocol.chains]))
		}
	}
	for (const protocol of dexVolumeData?.protocols ?? []) {
		if (!adapterDataStore[protocol.defillamaId]) {
			adapterDataStore[protocol.defillamaId] = {
				chains: protocol.chains
			}
		}
		adapterDataStore[protocol.defillamaId].dexVolume = {
			total24h: protocol.total24h ?? null,
			total7d: protocol.total7d ?? null,
			total30d: protocol.total30d ?? null,
			chains: Array.from(new Set([...adapterDataStore[protocol.defillamaId].chains, ...protocol.chains]))
		}
	}
	for (const protocol of perpVolumeData?.protocols ?? []) {
		if (!adapterDataStore[protocol.defillamaId]) {
			adapterDataStore[protocol.defillamaId] = {
				chains: protocol.chains
			}
		}
		adapterDataStore[protocol.defillamaId].perpVolume = {
			total24h: protocol.total24h ?? null,
			total7d: protocol.total7d ?? null,
			total30d: protocol.total30d ?? null,
			chains: Array.from(new Set([...adapterDataStore[protocol.defillamaId].chains, ...protocol.chains]))
		}
	}

	const protocolsStore = {}
	const parentProtocolsStore = {}

	for (const protocol of protocols) {
		if (
			protocol.category == category &&
			(chain ? protocol.chainTvls[chain] || adapterDataStore[protocol.defillamaId] : true)
		) {
			let tvl = 0
			const extraTvls: Record<string, number> = {}
			if (chain) {
				for (const pchain in protocol.chainTvls) {
					if (pchain.split('-')[0] !== chain) {
						continue
					}

					const extraKey = pchain.split('-')[1]

					if (
						extraKey &&
						(!DEFI_SETTINGS_KEYS.includes(extraKey) || !['doublecounted', 'liquidstaking'].includes(extraKey))
					) {
						continue
					}

					if (DEFI_SETTINGS_KEYS.includes(extraKey)) {
						extraTvls[extraKey] = (extraTvls[extraKey] ?? 0) + (protocol.chainTvls[pchain].tvl ?? 0)
						continue
					}

					tvl = tvl + (protocol.chainTvls[chain].tvl ?? 0)
				}
			} else {
				for (const pchain in protocol.chainTvls) {
					if (
						pchain.includes('-') ||
						pchain === 'offers' ||
						protocol.chainTvls[pchain].tvl == null ||
						['doublecounted', 'liquidstaking'].includes(pchain)
					) {
						continue
					}

					if (DEFI_SETTINGS_KEYS.includes(pchain)) {
						extraTvls[pchain] = (extraTvls[pchain] ?? 0) + (protocol.chainTvls[pchain].tvl ?? 0)
						continue
					}

					tvl = tvl + (protocol.chainTvls[pchain].tvl ?? 0)
				}
			}

			const borrowed = extraTvls.borrowed ?? null
			const supplied = borrowed && tvl > 0 ? borrowed + tvl : null
			const suppliedTvl = supplied ? (supplied / tvl).toFixed(2) : null
			const fees = adapterDataStore[protocol.defillamaId]?.fees ?? null
			const revenue = adapterDataStore[protocol.defillamaId]?.revenue ?? null
			const dexVolume = adapterDataStore[protocol.defillamaId]?.dexVolume ?? null
			const perpVolume = adapterDataStore[protocol.defillamaId]?.perpVolume ?? null

			const finalData = {
				name: protocol.name,
				slug: slug(protocol.name),
				logo: tokenIconUrl(protocol.name),
				chains: Array.from(
					new Set([...(adapterDataStore[protocol.defillamaId]?.chains ?? []), ...(protocol.chains ?? [])])
				),
				tvl,
				extraTvls,
				mcap: protocol.mcap ?? null,
				...(['Lending'].includes(category) ? { borrowed, supplied, suppliedTvl } : {}),
				fees,
				revenue,
				dexVolume,
				perpVolume
			}
			if (protocol.parentProtocol) {
				parentProtocolsStore[protocol.parentProtocol] = [
					...(parentProtocolsStore[protocol.parentProtocol] ?? []),
					finalData
				]
			} else {
				protocolsStore[protocol.defillamaId] = finalData
			}
		}
	}

	const finalProtocols = []
	for (const protocol in protocolsStore) {
		finalProtocols.push(protocolsStore[protocol])
	}
	for (const parentProtocol of parentProtocols) {
		if (parentProtocolsStore[parentProtocol.id]) {
			if (parentProtocolsStore[parentProtocol.id].length === 1) {
				finalProtocols.push(parentProtocolsStore[parentProtocol.id][0])
				continue
			}

			const tvl = parentProtocolsStore[parentProtocol.id].reduce((acc, p) => acc + p.tvl, 0)
			const extraTvls = parentProtocolsStore[parentProtocol.id].reduce((acc, p) => {
				for (const key in p.extraTvls) {
					acc[key] = (acc[key] ?? 0) + p.extraTvls[key]
				}
				return acc
			}, {})
			const borrowed = extraTvls.borrowed ?? null
			const supplied = borrowed && tvl > 0 ? borrowed + tvl : null
			const suppliedTvl = supplied ? (supplied / tvl).toFixed(2) : null
			const fees = parentProtocolsStore[parentProtocol.id].reduce(
				(acc, p) => ({
					total24h: acc.total24h + (p.fees?.total24h ?? 0),
					total7d: acc.total7d + (p.fees?.total7d ?? 0),
					total30d: acc.total30d + (p.fees?.total30d ?? 0)
				}),
				{
					total24h: 0,
					total7d: 0,
					total30d: 0
				}
			)
			const revenue = parentProtocolsStore[parentProtocol.id].reduce(
				(acc, p) => ({
					total24h: acc.total24h + (p.revenue?.total24h ?? 0),
					total7d: acc.total7d + (p.revenue?.total7d ?? 0),
					total30d: acc.total30d + (p.revenue?.total30d ?? 0)
				}),
				{
					total24h: 0,
					total7d: 0,
					total30d: 0
				}
			)
			const dexVolume = parentProtocolsStore[parentProtocol.id].reduce(
				(acc, p) => ({
					total24h: acc.total24h + (p.dexVolume?.total24h ?? 0),
					total7d: acc.total7d + (p.dexVolume?.total7d ?? 0),
					total30d: acc.total30d + (p.dexVolume?.total30d ?? 0)
				}),
				{
					total24h: 0,
					total7d: 0,
					total30d: 0
				}
			)
			const perpVolume = parentProtocolsStore[parentProtocol.id].reduce(
				(acc, p) => ({
					total24h: acc.total24h + (p.perpVolume?.total24h ?? 0),
					total7d: acc.total7d + (p.perpVolume?.total7d ?? 0),
					total30d: acc.total30d + (p.perpVolume?.total30d ?? 0)
				}),
				{
					total24h: 0,
					total7d: 0,
					total30d: 0
				}
			)

			finalProtocols.push({
				name: parentProtocol.name,
				slug: slug(parentProtocol.name),
				logo: tokenIconUrl(parentProtocol.name),
				chains: parentProtocol.chains,
				mcap: parentProtocol.mcap ?? null,
				tvl,
				...(['Lending'].includes(category) ? { borrowed, supplied, suppliedTvl } : {}),
				extraTvls,
				fees: fees.total24h == 0 && fees.total7d == 0 && fees.total30d == 0 ? null : fees,
				revenue: revenue.total24h == 0 && revenue.total7d == 0 && revenue.total30d == 0 ? null : revenue,
				dexVolume: dexVolume.total24h == 0 && dexVolume.total7d == 0 && dexVolume.total30d == 0 ? null : dexVolume,
				perpVolume: perpVolume.total24h == 0 && perpVolume.total7d == 0 && perpVolume.total30d == 0 ? null : perpVolume,
				subRows: parentProtocolsStore[parentProtocol.id].sort((a, b) => b.tvl - a.tvl)
			})
		}
	}

	let chart = []
	let extraTvlCharts: Record<string, Record<string, number>> = {}
	if (chain) {
		if (!tvlByCategories[chain]) return null
		chart = tvlByCategories[chain].map(([date, tvl]) => [+date * 1e3, tvl])
	} else {
		for (const date in tvlOnAllChains.chart) {
			chart.push([+date * 1e3, tvlOnAllChains.chart[date][category]?.tvl ?? null])
			for (const tvlType in tvlOnAllChains.chart[date][category]) {
				if (tvlType === 'tvl') continue
				extraTvlCharts[tvlType] = extraTvlCharts[tvlType] ?? {}
				extraTvlCharts[tvlType][+date * 1e3] = tvlOnAllChains.chart[date][category][tvlType]
			}
		}
	}

	const startIndex = chart.findIndex(([date, tvl]) => tvl != null)

	let fees7d = 0
	let revenue7d = 0
	let dexVolume7d = 0
	let perpVolume7d = 0

	for (const protocol of finalProtocols) {
		fees7d += protocol.fees?.total7d ?? 0
		revenue7d += protocol.revenue?.total7d ?? 0
		dexVolume7d += protocol.dexVolume?.total7d ?? 0
		perpVolume7d += protocol.perpVolume?.total7d ?? 0
	}

	return {
		charts: {
			TVL: {
				name: 'TVL',
				stack: 'TVL',
				data: chart.slice(startIndex),
				type: 'line',
				color: oldBlue
			}
		},
		chain: chain ?? 'All',
		protocols: finalProtocols.sort((a, b) => b.tvl - a.tvl),
		category,
		chains: [
			{ label: 'All', to: `/protocols/${category}` },
			...chains
				.sort((a, b) => b[1] - a[1])
				.map((c) => c[0])
				.map((c) => ({ label: c, to: `/protocols/${category}/${c}` }))
		],
		fees7d: fees7d > 0 ? fees7d : null,
		revenue7d: revenue7d > 0 ? revenue7d : null,
		dexVolume7d: dexVolume7d > 0 ? dexVolume7d : null,
		perpVolume7d: perpVolume7d > 0 ? perpVolume7d : null,
		extraTvlCharts
	}
}
