import { CATEGORY_CHART_API, PROTOCOLS_API, RWA_STATS_API_OLD, TAGS_CHART_API, ZERO_FEE_PERPS } from '~/constants'
import { CHART_COLORS } from '~/constants/colors'
import { TVL_SETTINGS_KEYS_SET } from '~/contexts/LocalStorage'
import { slug, tokenIconUrl } from '~/utils'
import { fetchJson } from '~/utils/async'
import { IChainMetadata, ILiteParentProtocol, ILiteProtocol } from '../ChainOverview/types'
import { getAdapterChainOverview, IAdapterOverview } from '../DimensionAdapters/queries'
import { IProtocolByCategoryOrTagPageData, IRWAStats } from './types'

type GetProtocolsByCategoryOrTagParams = {
	chain?: string
	chainMetadata: Record<string, IChainMetadata>
} & (
	| {
			kind: 'category'
			category: string
			tag?: never
			tagCategory?: never
	  }
	| {
			kind: 'tag'
			tag: string
			tagCategory: string
			category?: never
	  }
)

export async function getProtocolsByCategoryOrTag(
	params: GetProtocolsByCategoryOrTagParams
): Promise<IProtocolByCategoryOrTagPageData | null> {
	const { chain, chainMetadata } = params
	const category = params.kind === 'category' ? params.category : undefined
	const tag = params.kind === 'tag' ? params.tag : undefined
	// For tag pages, we use the tag's parent category for category-specific logic.
	const effectiveCategory = params.kind === 'category' ? params.category : params.tagCategory

	const currentChainMetadata: IChainMetadata = chain
		? chainMetadata[slug(chain)]
		: {
				name: 'All',
				fees: true,
				dexs: true,
				perps: true,
				openInterest: true,
				optionsPremiumVolume: true,
				optionsNotionalVolume: true,
				id: 'all'
			}

	if (!currentChainMetadata) {
		return null
	}

	const [
		{ protocols, parentProtocols },
		feesData,
		revenueData,
		dexVolumeData,
		perpVolumeData,
		openInterestData,
		optionsPremiumData,
		optionsNotionalData,
		chartData,
		chainsByCategoriesOrTags,
		rwaStats
	]: [
		{ protocols: Array<ILiteProtocol>; parentProtocols: Array<ILiteParentProtocol> },
		IAdapterOverview | null,
		IAdapterOverview | null,
		IAdapterOverview | null,
		IAdapterOverview | null,
		IAdapterOverview | null,
		IAdapterOverview | null,
		IAdapterOverview | null,
		Record<string, Record<string, number | null>>,
		Record<string, Array<string>>,
		Record<string, IRWAStats>
	] = await Promise.all([
		fetchJson(PROTOCOLS_API),
		currentChainMetadata?.fees
			? getAdapterChainOverview({
					chain: chain ?? 'All',
					adapterType: 'fees',
					excludeTotalDataChart: true
				})
			: null,
		currentChainMetadata?.fees
			? getAdapterChainOverview({
					chain: chain ?? 'All',
					adapterType: 'fees',
					dataType: 'dailyRevenue',
					excludeTotalDataChart: true
				})
			: null,
		currentChainMetadata?.dexs &&
		effectiveCategory &&
		['Dexs', 'DEX Aggregators', 'Prediction Market'].includes(effectiveCategory)
			? getAdapterChainOverview({
					chain: chain ?? 'All',
					adapterType: effectiveCategory === 'DEX Aggregators' ? 'aggregators' : 'dexs',
					excludeTotalDataChart: true
				})
			: null,
		currentChainMetadata?.perps && effectiveCategory && ['Derivatives', 'Interface'].includes(effectiveCategory)
			? getAdapterChainOverview({
					chain: chain ?? 'All',
					adapterType: 'derivatives',
					excludeTotalDataChart: true
				})
			: null,
		currentChainMetadata?.openInterest &&
		effectiveCategory &&
		['Derivatives', 'Prediction Market'].includes(effectiveCategory)
			? getAdapterChainOverview({
					chain: chain ?? 'All',
					adapterType: 'open-interest',
					dataType: 'openInterestAtEnd',
					excludeTotalDataChart: true
				}).catch((err) => {
					console.log(err)
					return null
				})
			: null,
		currentChainMetadata?.optionsPremiumVolume && effectiveCategory === 'Options'
			? getAdapterChainOverview({
					chain: chain ?? 'All',
					adapterType: 'options',
					dataType: 'dailyPremiumVolume',
					excludeTotalDataChart: true
				})
			: null,
		currentChainMetadata?.optionsNotionalVolume && effectiveCategory === 'Options'
			? getAdapterChainOverview({
					chain: chain ?? 'All',
					adapterType: 'options',
					dataType: 'dailyNotionalVolume',
					excludeTotalDataChart: true
				})
			: null,
		tag
			? fetchJson(`${TAGS_CHART_API}/${slug(tag)}${chain ? `/${slug(chain)}` : ''}`)
			: fetchJson(`${CATEGORY_CHART_API}/${slug(category)}${chain ? `/${slug(chain)}` : ''}`),
		tag
			? fetchJson('https://api.llama.fi/lite/chains-by-tags').catch(() => null)
			: fetchJson('https://api.llama.fi/lite/chains-by-categories').catch(() => null),
		effectiveCategory === 'RWA' ? fetchJson(RWA_STATS_API_OLD) : null
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
			chains: Array.from(new Set([...adapterDataStore[protocol.defillamaId].chains, ...protocol.chains])),
			...(protocol.doublecounted ? { doublecounted: protocol.doublecounted } : {}),
			...(ZERO_FEE_PERPS.has(protocol.displayName) ? { zeroFeePerp: true } : {})
		}
	}
	for (const protocol of openInterestData?.protocols ?? []) {
		if (!adapterDataStore[protocol.defillamaId]) {
			adapterDataStore[protocol.defillamaId] = {
				chains: protocol.chains
			}
		}
		adapterDataStore[protocol.defillamaId].openInterest = {
			total24h: protocol.total24h ?? null,
			chains: Array.from(new Set([...adapterDataStore[protocol.defillamaId].chains, ...protocol.chains]))
		}
	}
	for (const protocol of optionsPremiumData?.protocols ?? []) {
		if (!adapterDataStore[protocol.defillamaId]) {
			adapterDataStore[protocol.defillamaId] = {
				chains: protocol.chains
			}
		}
		adapterDataStore[protocol.defillamaId].optionsPremium = {
			total24h: protocol.total24h ?? null,
			total7d: protocol.total7d ?? null,
			total30d: protocol.total30d ?? null,
			chains: Array.from(new Set([...adapterDataStore[protocol.defillamaId].chains, ...protocol.chains]))
		}
	}
	for (const protocol of optionsNotionalData?.protocols ?? []) {
		if (!adapterDataStore[protocol.defillamaId]) {
			adapterDataStore[protocol.defillamaId] = {
				chains: protocol.chains
			}
		}
		adapterDataStore[protocol.defillamaId].optionsNotional = {
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
			let tvl = null
			const extraTvls: Record<string, number> = {}
			if (chain) {
				for (const pchain in protocol.chainTvls) {
					if (protocol.chainTvls[pchain].tvl == null) {
						continue
					}

					const chainName = pchain.split('-')[0]
					if (chainName !== currentChainMetadata.name) {
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
								!TVL_SETTINGS_KEYS_SET.has(extraKey)
							: false
					) {
						continue
					}

					if (TVL_SETTINGS_KEYS_SET.has(extraKey)) {
						extraTvls[extraKey] = (extraTvls[extraKey] ?? 0) + (protocol.chainTvls[pchain].tvl ?? 0)
						continue
					}

					tvl = (tvl ?? 0) + (protocol.chainTvls[pchain].tvl ?? 0)
				}
			} else {
				for (const pchain in protocol.chainTvls) {
					if (protocol.chainTvls[pchain].tvl == null) {
						continue
					}

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

					if (TVL_SETTINGS_KEYS_SET.has(pchain)) {
						extraTvls[pchain] = (extraTvls[pchain] ?? 0) + (protocol.chainTvls[pchain].tvl ?? 0)
						continue
					}

					tvl = (tvl ?? 0) + (protocol.chainTvls[pchain].tvl ?? 0)
				}
			}

			const borrowed = extraTvls.borrowed ?? null
			const supplied = borrowed && tvl != null && tvl > 0 ? borrowed + tvl : null
			const suppliedTvl = supplied && tvl != null ? (supplied / tvl).toFixed(2) : null
			const fees = adapterDataStore[protocol.defillamaId]?.fees ?? null
			const revenue = adapterDataStore[protocol.defillamaId]?.revenue ?? null
			const dexVolume = adapterDataStore[protocol.defillamaId]?.dexVolume ?? null
			const perpVolume = adapterDataStore[protocol.defillamaId]?.perpVolume ?? null
			const openInterest = adapterDataStore[protocol.defillamaId]?.openInterest ?? null
			const optionsPremium = adapterDataStore[protocol.defillamaId]?.optionsPremium ?? null
			const optionsNotional = adapterDataStore[protocol.defillamaId]?.optionsNotional ?? null

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
				...(effectiveCategory && ['Lending'].includes(effectiveCategory) ? { borrowed, supplied, suppliedTvl } : {}),
				fees,
				revenue,
				dexVolume,
				perpVolume,
				openInterest,
				optionsPremium,
				optionsNotional,
				tags: protocol.tags ?? [],
				...(effectiveCategory === 'RWA' ? { rwaStats: rwaStats[protocol.defillamaId] ?? null } : {})
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

			let tvl = parentProtocolsStore[parentProtocol.id].some((p) => p.tvl != null)
				? parentProtocolsStore[parentProtocol.id].reduce((acc, p) => acc + (p.tvl ?? 0), 0)
				: null
			const extraTvls = parentProtocolsStore[parentProtocol.id].reduce((acc, p) => {
				for (const key in p.extraTvls) {
					acc[key] = (acc[key] ?? 0) + p.extraTvls[key]
				}
				return acc
			}, {})

			if (extraTvls.excludeParent != null) {
				tvl = (tvl ?? 0) - (extraTvls.excludeParent ?? 0)
			}

			const borrowed = extraTvls.borrowed ?? null
			const supplied = borrowed && tvl != null && tvl > 0 ? borrowed + (tvl ?? 0) : null
			const suppliedTvl = supplied && tvl != null ? (supplied / tvl).toFixed(2) : null
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
			const openInterest = parentProtocolsStore[parentProtocol.id].reduce(
				(acc, p) => ({
					total24h: acc.total24h + (p.openInterest?.total24h ?? 0)
				}),
				{
					total24h: 0
				}
			)
			const optionsPremium = parentProtocolsStore[parentProtocol.id].reduce(
				(acc, p) => ({
					total24h: acc.total24h + (p.optionsPremium?.total24h ?? 0),
					total7d: acc.total7d + (p.optionsPremium?.total7d ?? 0),
					total30d: acc.total30d + (p.optionsPremium?.total30d ?? 0)
				}),
				{
					total24h: 0,
					total7d: 0,
					total30d: 0
				}
			)
			const optionsNotional = parentProtocolsStore[parentProtocol.id].reduce(
				(acc, p) => ({
					total24h: acc.total24h + (p.optionsNotional?.total24h ?? 0),
					total7d: acc.total7d + (p.optionsNotional?.total7d ?? 0),
					total30d: acc.total30d + (p.optionsNotional?.total30d ?? 0)
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
				...(effectiveCategory && ['Lending'].includes(effectiveCategory) ? { borrowed, supplied, suppliedTvl } : {}),
				extraTvls,
				fees: fees.total24h == 0 && fees.total7d == 0 && fees.total30d == 0 ? null : fees,
				revenue: revenue.total24h == 0 && revenue.total7d == 0 && revenue.total30d == 0 ? null : revenue,
				dexVolume: dexVolume.total24h == 0 && dexVolume.total7d == 0 && dexVolume.total30d == 0 ? null : dexVolume,
				perpVolume: perpVolume.total24h == 0 && perpVolume.total7d == 0 && perpVolume.total30d == 0 ? null : perpVolume,
				openInterest: openInterest.total24h == 0 ? null : openInterest,
				optionsPremium:
					optionsPremium.total24h == 0 && optionsPremium.total7d == 0 && optionsPremium.total30d == 0
						? null
						: optionsPremium,
				optionsNotional:
					optionsNotional.total24h == 0 && optionsNotional.total7d == 0 && optionsNotional.total30d == 0
						? null
						: optionsNotional,
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

	const startIndex = chart.findIndex(([, tvl]) => tvl != null)

	let fees7d = 0
	let revenue7d = 0
	let dexVolume7d = 0
	let perpVolume7d = 0
	let openInterest = 0
	let optionsPremium7d = 0
	let optionsNotional7d = 0

	for (const protocol of finalProtocols) {
		fees7d += protocol.fees?.total7d ?? 0
		revenue7d += protocol.revenue?.total7d ?? 0
		dexVolume7d += protocol.dexVolume?.total7d ?? 0
		perpVolume7d += protocol.perpVolume?.total7d ?? 0
		openInterest += protocol.openInterest?.total24h ?? 0
		optionsPremium7d += protocol.optionsPremium?.total7d ?? 0
		optionsNotional7d += protocol.optionsNotional?.total7d ?? 0
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
		chain: currentChainMetadata?.name ?? 'All',
		protocols: (chain
			? finalProtocols.filter((p) => p.chains.includes(currentChainMetadata.name))
			: finalProtocols
		).sort((a, b) => b.tvl - a.tvl),
		category: category ?? null,
		tag: tag ?? null,
		effectiveCategory,
		chains: [
			{ label: 'All', to: `/protocols/${slug(category ?? tag)}` },
			...chains.map((c) => ({ label: c, to: `/protocols/${slug(category ?? tag)}/${slug(c)}` }))
		],
		fees7d: fees7d > 0 ? fees7d : null,
		revenue7d: revenue7d > 0 ? revenue7d : null,
		dexVolume7d: dexVolume7d > 0 ? dexVolume7d : null,
		perpVolume7d: perpVolume7d > 0 ? perpVolume7d : null,
		openInterest: openInterest > 0 ? openInterest : null,
		optionsPremium7d: optionsPremium7d > 0 ? optionsPremium7d : null,
		optionsNotional7d: optionsNotional7d > 0 ? optionsNotional7d : null,
		extraTvlCharts
	}
}
