import { CATEGORY_CHART_API, PROTOCOLS_API, RWA_STATS_API, TAGS_CHART_API } from '~/constants'
import { CHART_COLORS } from '~/constants/colors'
import { DEFI_SETTINGS_KEYS } from '~/contexts/LocalStorage'
import { slug, tokenIconUrl } from '~/utils'
import { fetchJson } from '~/utils/async'
import { ILiteParentProtocol, ILiteProtocol } from '../ChainOverview/types'
import { getAdapterChainOverview, IAdapterOverview } from '../DimensionAdapters/queries'
import { IProtocolByCategoryOrTagPageData, IRWAStats } from './types'

export async function getProtocolsByCategoryOrTag({
	category,
	tag,
	chain
}: {
	category?: string
	tag?: string
	chain?: string
}): Promise<IProtocolByCategoryOrTagPageData> {
	if (category && tag) {
		return null
	}

	if (!category && !tag) {
		return null
	}

	const metadataCache = await import('~/utils/metadata').then((m) => m.default)
	const chainMetadata = chain
		? metadataCache.chainMetadata[slug(chain)]
		: { name: 'All', fees: true, dexs: true, perps: true }

	if (!chainMetadata) {
		return null
	}

	// todo need to use parent category of tag
	const isRWA = category === 'RWA' || tag ? true : false

	const [
		{ protocols, parentProtocols },
		feesData,
		revenueData,
		dexVolumeData,
		perpVolumeData,
		chartData,
		chainsByCategoriesOrTags,
		rwaStats
	]: [
		{ protocols: Array<ILiteProtocol>; parentProtocols: Array<ILiteParentProtocol> },
		IAdapterOverview | null,
		IAdapterOverview | null,
		IAdapterOverview | null,
		IAdapterOverview | null,
		Record<string, Record<string, number | null>>,
		Record<string, Array<string>>,
		Record<string, IRWAStats>
	] = await Promise.all([
		fetchJson(PROTOCOLS_API),
		chainMetadata?.fees
			? getAdapterChainOverview({
					chain: chain ?? 'All',
					adapterType: 'fees',
					excludeTotalDataChart: true,
					excludeTotalDataChartBreakdown: true
				})
			: null,
		chainMetadata?.fees
			? getAdapterChainOverview({
					chain: chain ?? 'All',
					adapterType: 'fees',
					dataType: 'dailyRevenue',
					excludeTotalDataChart: true,
					excludeTotalDataChartBreakdown: true
				})
			: null,
		chainMetadata?.dexs
			? getAdapterChainOverview({
					chain: chain ?? 'All',
					adapterType: 'dexs',
					excludeTotalDataChart: true,
					excludeTotalDataChartBreakdown: true
				})
			: null,
		chainMetadata?.perps
			? getAdapterChainOverview({
					chain: chain ?? 'All',
					adapterType: 'derivatives',
					excludeTotalDataChart: true,
					excludeTotalDataChartBreakdown: true
				})
			: null,
		tag
			? fetchJson(`${TAGS_CHART_API}/${slug(tag)}${chain ? `/${slug(chain)}` : ''}`)
			: fetchJson(`${CATEGORY_CHART_API}/${slug(category)}${chain ? `/${slug(chain)}` : ''}`),
		tag
			? fetchJson('https://api.llama.fi/lite/chains-by-tags').catch(() => null)
			: fetchJson('https://api.llama.fi/lite/chains-by-categories').catch(() => null),
		isRWA ? fetchJson(RWA_STATS_API) : null
	])

	const chains = chainsByCategoriesOrTags?.[tag ?? category] ?? []

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
		const isProtocolInCategoryOrTag = tag ? (protocol.tags ?? []).includes(tag) : protocol.category == category
		if (isProtocolInCategoryOrTag) {
			let tvl = 0
			const extraTvls: Record<string, number> = {}
			if (chain) {
				for (const pchain in protocol.chainTvls) {
					const chainName = pchain.split('-')[0]
					if (chainName !== chainMetadata.name) {
						continue
					}

					const extraKey = pchain.split('-')[1]

					if (extraKey === 'excludeParent') {
						extraTvls.excludeParent = (extraTvls.excludeParent ?? 0) + (protocol.chainTvls[pchain].tvl ?? 0)
						continue
					}

					if (
						extraKey
							? ['doublecounted', 'liquidstaking', 'dcAndLsOverlap', 'offers'].includes(extraKey) ||
								!DEFI_SETTINGS_KEYS.includes(extraKey)
							: false
					) {
						continue
					}

					if (DEFI_SETTINGS_KEYS.includes(extraKey)) {
						extraTvls[extraKey] = (extraTvls[extraKey] ?? 0) + (protocol.chainTvls[pchain].tvl ?? 0)
						continue
					}

					tvl = tvl + (protocol.chainTvls[pchain].tvl ?? 0)
				}
			} else {
				for (const pchain in protocol.chainTvls) {
					if (pchain === 'excludeParent') {
						extraTvls[pchain] = (extraTvls[pchain] ?? 0) + (protocol.chainTvls[pchain].tvl ?? 0)
						continue
					}

					if (
						['doublecounted', 'liquidstaking', 'dcAndLsOverlap', 'offers'].includes(pchain) ||
						pchain.includes('-') ||
						protocol.chainTvls[pchain].tvl == null
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
				...(category && ['Lending'].includes(category) ? { borrowed, supplied, suppliedTvl } : {}),
				fees,
				revenue,
				dexVolume,
				perpVolume,
				tags: protocol.tags ?? [],
				...(isRWA ? { rwaStats: rwaStats[protocol.defillamaId] ?? null } : {})
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

			let tvl = parentProtocolsStore[parentProtocol.id].reduce((acc, p) => acc + p.tvl, 0)
			const extraTvls = parentProtocolsStore[parentProtocol.id].reduce((acc, p) => {
				for (const key in p.extraTvls) {
					acc[key] = (acc[key] ?? 0) + p.extraTvls[key]
				}
				return acc
			}, {})

			tvl -= extraTvls.excludeParent ?? 0

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

			const hasRWAStats = parentProtocolsStore[parentProtocol.id].some((p) => p.rwaStats != null)
			const rwaStats: IRWAStats = {
				volumeUsd1d: 0,
				volumeUsd7d: 0,
				tvlUsd: 0,
				symbols: []
			}
			for (const protocol of parentProtocolsStore[parentProtocol.id]) {
				if (protocol.rwaStats) {
					rwaStats.volumeUsd1d += protocol.rwaStats.volumeUsd1d
					rwaStats.volumeUsd7d += protocol.rwaStats.volumeUsd7d
					rwaStats.tvlUsd += protocol.rwaStats.tvlUsd
					rwaStats.symbols = Array.from(new Set([...rwaStats.symbols, ...protocol.rwaStats.symbols]))
					// hide for parent protocols
					// rwaStats.matchExact = rwaStats.matchExact && (protocol.rwaStats.matchExact ?? false)
					// rwaStats.redeemable = rwaStats.redeemable && (protocol.rwaStats.redeemable ?? false)
					// rwaStats.attestations = rwaStats.attestations && (protocol.rwaStats.attestations ?? false)
					// rwaStats.cexListed = rwaStats.cexListed && (protocol.rwaStats.cexListed ?? false)
					// rwaStats.kyc = rwaStats.kyc && (protocol.rwaStats.kyc ?? false)
					// rwaStats.transferable = rwaStats.transferable && (protocol.rwaStats.transferable ?? false)
					// rwaStats.selfCustody = rwaStats.selfCustody && (protocol.rwaStats.selfCustody ?? false)
				}
			}

			finalProtocols.push({
				name: parentProtocol.name,
				slug: slug(parentProtocol.name),
				logo: tokenIconUrl(parentProtocol.name),
				chains: parentProtocol.chains,
				mcap: parentProtocol.mcap ?? null,
				tvl,
				...(category && ['Lending'].includes(category) ? { borrowed, supplied, suppliedTvl } : {}),
				extraTvls,
				fees: fees.total24h == 0 && fees.total7d == 0 && fees.total30d == 0 ? null : fees,
				revenue: revenue.total24h == 0 && revenue.total7d == 0 && revenue.total30d == 0 ? null : revenue,
				dexVolume: dexVolume.total24h == 0 && dexVolume.total7d == 0 && dexVolume.total30d == 0 ? null : dexVolume,
				perpVolume: perpVolume.total24h == 0 && perpVolume.total7d == 0 && perpVolume.total30d == 0 ? null : perpVolume,
				subRows: parentProtocolsStore[parentProtocol.id].sort((a, b) => b.tvl - a.tvl),
				tags: Array.from(new Set(parentProtocolsStore[parentProtocol.id].flatMap((p) => p.tags ?? []))),
				...(hasRWAStats ? { rwaStats } : {})
			})
		}
	}

	let chart = []
	let extraTvlCharts: Record<string, Record<string | number, number | null>> = {}
	for (const chartType in chartData) {
		if (['doublecounted', 'liquidstaking', 'dcAndLsOverlap'].includes(chartType)) continue

		if (chartType === 'tvl') {
			for (const date in chartData[chartType]) {
				chart.push([+date * 1e3, chartData[chartType][date] ?? null])
			}
		} else {
			if (!extraTvlCharts[chartType]) {
				extraTvlCharts[chartType] = {}
			}
			for (const date in chartData[chartType]) {
				extraTvlCharts[chartType][+date * 1e3] = chartData[chartType][date] ?? null
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
				color: CHART_COLORS[0]
			}
		},
		chain: chainMetadata?.name ?? 'All',
		protocols: (chain ? finalProtocols.filter((p) => p.chains.includes(chainMetadata.name)) : finalProtocols).sort(
			(a, b) => b.tvl - a.tvl
		),
		category: category ?? null,
		tag: tag ?? null,
		isRWA,
		chains: [
			{ label: 'All', to: `/protocols/${slug(category ?? tag)}` },
			...chains.map((c) => ({ label: c, to: `/protocols/${slug(category ?? tag)}/${slug(c)}` }))
		],
		fees7d: fees7d > 0 ? fees7d : null,
		revenue7d: revenue7d > 0 ? revenue7d : null,
		dexVolume7d: dexVolume7d > 0 ? dexVolume7d : null,
		perpVolume7d: perpVolume7d > 0 ? perpVolume7d : null,
		extraTvlCharts
	}
}
