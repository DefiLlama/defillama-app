import type { IOverviewProps } from '~/api/categories/adaptors'
import type { ChainMetricSnapshot, IFormattedProtocol, IParentProtocol } from '~/api/types'
import { removedCategoriesFromChainTvlSet } from '~/constants'
import type { IChainAsset, IProtocol } from '~/containers/ChainOverview/types'
import { formatNum, getPercentChange } from '~/utils'
import { groupProtocols } from './utils'

interface IFormattedChainAssetsSummary {
	total: string | number
	ownTokens: string | null
	canonical: string | null
	native: string | null
	thirdParty: string | null
}

type ChainAssetsField = IFormattedChainAssetsSummary | IChainAsset | null

export interface IFormattedDataWithExtraTvl {
	chainAssets?: ChainAssetsField
	tvl: number
	tvlPrevDay: number
	tvlPrevWeek: number
	tvlPrevMonth: number
	change_1d: number | null
	change_7d: number | null
	change_1m: number | null
	mcap: number | null
	mcaptvl: number | null
	name: string
	subRows?: Array<{
		chainAssets?: ChainAssetsField
		tvl: number
		tvlPrevDay: number
		tvlPrevWeek: number
		tvlPrevMonth: number
		change_1d: number | null
		change_7d: number | null
		change_1m: number | null
		mcap: number | null
		mcaptvl: number | null
		name: string
	}>
}

type DimensionDatasetItem = {
	name?: string
	displayName?: string
	total24h?: number
	total7d?: number
	total30d?: number
	total1y?: number
	change_1d?: number
	change_7d?: number
	change_1m?: number
	chains?: string[]
	chainBreakdown?: Record<string, unknown>
}

export const formatProtocolsList = ({
	protocols,
	parentProtocols,
	extraTvlsEnabled,
	volumeData,
	feesData,
	perpsData,
	openInterestData,
	earningsData,
	aggregatorsData,
	bridgeAggregatorsData,
	optionsData,
	noSubrows
}: {
	protocols: IFormattedProtocol[]
	parentProtocols: IParentProtocol[]
	extraTvlsEnabled: Record<string, boolean>
	volumeData?: IOverviewProps['protocols']
	feesData?: IOverviewProps['protocols']
	perpsData?: IOverviewProps['protocols']
	openInterestData?: IOverviewProps['protocols']
	earningsData?: DimensionDatasetItem[]
	aggregatorsData?: DimensionDatasetItem[]
	bridgeAggregatorsData?: DimensionDatasetItem[]
	optionsData?: DimensionDatasetItem[]
	noSubrows?: boolean
}): IFormattedProtocol[] => {
	const checkExtras = {
		...extraTvlsEnabled,
		doublecounted: !extraTvlsEnabled.doublecounted
	}

	const mergeChainBreakdown = (
		existing: Record<string, ChainMetricSnapshot> | undefined,
		incoming?: Record<string, unknown>
	): Record<string, ChainMetricSnapshot> | undefined => {
		if (!incoming) return existing
		const next: Record<string, ChainMetricSnapshot> = { ...(existing ?? {}) }
		for (const key in incoming) {
			const rawValue = incoming[key]
			if (!rawValue || typeof rawValue !== 'object') continue
			const value = rawValue as Record<string, unknown>
			const chainLabel = typeof value.chain === 'string' && value.chain.trim().length ? value.chain : key
			const normalizedKey =
				typeof chainLabel === 'string' && chainLabel.trim().length
					? chainLabel.trim().toLowerCase()
					: key.trim().toLowerCase()
			next[normalizedKey] = {
				...(value as ChainMetricSnapshot),
				chain: chainLabel
			}
		}
		return next
	}

	const getChainBreakdown = (item: object): Record<string, unknown> | undefined => {
		const rec = item as Record<string, unknown>
		return typeof rec.chainBreakdown === 'object' && rec.chainBreakdown != null
			? (rec.chainBreakdown as Record<string, unknown>)
			: undefined
	}

	const allProtocols: Record<string, IFormattedProtocol> = {}

	// Use for..in loop instead of Object.values() for better performance
	let shouldModifyTvl = false
	for (const key in checkExtras) {
		if (checkExtras[key]) {
			shouldModifyTvl = true
			break
		}
	}

	for (const protocol of protocols) {
		const { tvl, tvlPrevDay, tvlPrevWeek, tvlPrevMonth, extraTvl, mcap, name, ...props } = protocol
		let finalTvl: number | null = tvl
		let finalTvlPrevDay: number | null = tvlPrevDay
		let finalTvlPrevWeek: number | null = tvlPrevWeek
		let finalTvlPrevMonth: number | null = tvlPrevMonth
		let strikeTvl = false

		if (shouldModifyTvl) {
			// keep liquid staking in same position in table but strike its tvl
			if (props.category === 'Liquid Staking' && !extraTvlsEnabled['liquidstaking']) {
				strikeTvl = true
			}

			if (props.category != null && removedCategoriesFromChainTvlSet.has(props.category)) {
				strikeTvl = true
			}

			for (const prop in extraTvl) {
				const { tvl, tvlPrevDay, tvlPrevWeek, tvlPrevMonth } = extraTvl[prop] ?? {}
				if (
					prop === 'doublecounted' &&
					!extraTvlsEnabled['doublecounted'] &&
					(props.category === 'Liquid Staking' ? !extraTvlsEnabled['liquidstaking'] : true)
				) {
					strikeTvl = true
				} else {
					// convert to lowercase as server response is not consistent in extra-tvl names
					if (
						extraTvlsEnabled[prop.toLowerCase()] &&
						prop.toLowerCase() !== 'doublecounted' &&
						prop.toLowerCase() !== 'liquidstaking'
					) {
						// check if final tvls are null, if they are null and tvl exist on selected option, convert to 0 and add them
						if (tvl != null) {
							finalTvl = (finalTvl || 0) + tvl
						}
						if (tvlPrevDay != null) {
							finalTvlPrevDay = (finalTvlPrevDay || 0) + tvlPrevDay
						}
						if (tvlPrevWeek != null) {
							finalTvlPrevWeek = (finalTvlPrevWeek || 0) + tvlPrevWeek
						}
						if (tvlPrevMonth != null) {
							finalTvlPrevMonth = (finalTvlPrevMonth || 0) + tvlPrevMonth
						}
					}
				}
			}
		}

		let change1d: number | null = getPercentChange(finalTvl, finalTvlPrevDay)
		let change7d: number | null = getPercentChange(finalTvl, finalTvlPrevWeek)
		let change1m: number | null = getPercentChange(finalTvl, finalTvlPrevMonth)

		let mcaptvl: number | null = null
		{
			const t = finalTvl
			if (mcap != null && t != null && t !== 0) {
				mcaptvl = +(formatNum(+mcap.toFixed(2) / +t.toFixed(2)) ?? 0)
			}
		}

		allProtocols[name?.toLowerCase()] = {
			...props,
			extraTvl,
			name,
			tvl: finalTvl,
			tvlPrevDay: finalTvlPrevDay,
			tvlPrevWeek: finalTvlPrevWeek,
			tvlPrevMonth: finalTvlPrevMonth,
			change_1d: change1d,
			change_7d: change7d,
			change_1m: change1m,
			mcap,
			mcaptvl,
			strikeTvl
		}
	}

	for (const protocol of feesData ?? []) {
		const protocolName = protocol.name?.toLowerCase()
		if (!protocolName) continue
		if (!allProtocols[protocolName]) {
			allProtocols[protocolName] = { name: protocol.displayName ?? protocol.name } as IFormattedProtocol
		}

		const previous = allProtocols[protocolName]
		const mergedChains = Array.from(new Set([...(previous.chains ?? []), ...(protocol.chains ?? [])]))

		allProtocols[protocolName] = {
			...previous,
			chains: mergedChains,
			fees_24h: protocol.total24h ?? undefined,
			revenue_24h: protocol.revenue24h ?? undefined,
			fees_7d: protocol.total7d ?? undefined,
			revenue_7d: protocol.revenue7d ?? undefined,
			fees_30d: protocol.total30d ?? undefined,
			fees_1y: protocol.total1y ?? undefined,
			revenue_30d: protocol.revenue30d ?? undefined,
			revenue_1y: protocol.revenue1y ?? undefined,
			feesChange_1d: protocol.feesChange_1d ?? previous.feesChange_1d ?? undefined,
			feesChange_7d: protocol.feesChange_7d ?? previous.feesChange_7d ?? undefined,
			feesChange_1m: protocol.feesChange_1m ?? previous.feesChange_1m ?? undefined,
			feesChange_7dover7d: protocol.feesChange_7dover7d ?? undefined,
			feesChange_30dover30d: protocol.feesChange_30dover30d ?? undefined,
			revenueChange_1d: protocol.revenueChange_1d ?? previous.revenueChange_1d ?? undefined,
			revenueChange_7d: protocol.revenueChange_7d ?? previous.revenueChange_7d ?? undefined,
			revenueChange_1m: protocol.revenueChange_1m ?? previous.revenueChange_1m ?? undefined,
			revenueChange_7dover7d: protocol.revenueChange_7dover7d ?? undefined,
			revenueChange_30dover30d: protocol.revenueChange_30dover30d ?? undefined,
			average_1y: protocol.monthlyAverage1y ?? undefined,
			average_revenue_1y: protocol.averageRevenue1y || undefined,
			holdersRevenue30d: protocol.holdersRevenue30d || undefined,
			holderRevenue_24h: protocol.holdersRevenue24h || undefined,
			holdersRevenueChange_30dover30d: protocol.holdersRevenueChange_30dover30d || undefined,
			treasuryRevenue_24h: protocol.dailyProtocolRevenue || undefined,
			supplySideRevenue_24h: protocol.dailySupplySideRevenue || undefined,
			userFees_24h: protocol.dailyUserFees || undefined,
			cumulativeFees: protocol.totalAllTime || undefined,
			pf: protocol.pf ?? previous.pf ?? undefined,
			ps: protocol.ps ?? previous.ps ?? undefined,
			feesByChain: mergeChainBreakdown(previous.feesByChain, getChainBreakdown(protocol)),
			revenueByChain: mergeChainBreakdown(previous.revenueByChain, getChainBreakdown(protocol))
		}
	}

	for (const protocol of volumeData ?? []) {
		const protocolName = protocol.name?.toLowerCase()
		if (!protocolName) continue
		if (!allProtocols[protocolName]) {
			allProtocols[protocolName] = { name: protocol.displayName } as IFormattedProtocol
		}
		const previous = allProtocols[protocolName]
		const mergedChains = Array.from(new Set([...(previous.chains ?? []), ...(protocol.chains ?? [])]))

		allProtocols[protocolName] = {
			...previous,
			chains: mergedChains,
			volume_24h: protocol.total24h ?? undefined,
			volume_7d: protocol.total7d ?? undefined,
			volume_30d: protocol.total30d ?? undefined,
			volumeChange_1d: protocol.change_1d ?? previous.volumeChange_1d,
			volumeChange_7d: protocol.change_7d ?? previous.volumeChange_7d,
			volumeChange_1m: protocol.change_1m ?? previous.volumeChange_1m,
			cumulativeVolume: protocol.totalAllTime ?? previous.cumulativeVolume,
			volumeByChain: mergeChainBreakdown(previous.volumeByChain, getChainBreakdown(protocol))
		}
	}

	for (const protocol of perpsData ?? []) {
		const protocolName = protocol.name?.toLowerCase()
		if (!protocolName) continue
		if (!allProtocols[protocolName]) {
			allProtocols[protocolName] = { name: protocol.displayName } as IFormattedProtocol
		}
		const previous = allProtocols[protocolName]
		const mergedChains = Array.from(new Set([...(previous.chains ?? []), ...(protocol.chains ?? [])]))

		allProtocols[protocolName] = {
			...previous,
			chains: mergedChains,
			perps_volume_24h: protocol.total24h ?? undefined,
			perps_volume_7d: protocol.total7d ?? undefined,
			perps_volume_30d: protocol.total30d ?? undefined,
			perps_volume_change_1d: protocol.change_1d ?? previous.perps_volume_change_1d,
			perps_volume_change_7d: protocol.change_7d ?? previous.perps_volume_change_7d,
			perps_volume_change_1m: protocol.change_1m ?? previous.perps_volume_change_1m,
			perpsVolumeByChain: mergeChainBreakdown(previous.perpsVolumeByChain, getChainBreakdown(protocol))
		}
	}

	for (const protocol of openInterestData ?? []) {
		const protocolName = protocol.name?.toLowerCase()
		if (!protocolName) continue
		if (!allProtocols[protocolName]) {
			allProtocols[protocolName] = { name: protocol.displayName } as IFormattedProtocol
		}
		const previous = allProtocols[protocolName]
		const mergedChains = Array.from(new Set([...(previous.chains ?? []), ...(protocol.chains ?? [])]))

		allProtocols[protocolName] = {
			...previous,
			chains: mergedChains,
			openInterest: protocol.total24h,
			openInterestByChain: mergeChainBreakdown(previous.openInterestByChain, getChainBreakdown(protocol))
		}
	}

	for (const protocol of earningsData ?? []) {
		const protocolName = protocol.name?.toLowerCase()
		if (!protocolName) continue
		if (!allProtocols[protocolName]) {
			allProtocols[protocolName] = { name: protocol.displayName ?? protocol.name } as IFormattedProtocol
		}
		const previous = allProtocols[protocolName]
		const mergedChains = Array.from(new Set([...(previous.chains ?? []), ...(protocol.chains ?? [])]))

		allProtocols[protocolName] = {
			...previous,
			chains: mergedChains,
			earnings_24h: protocol.total24h ?? previous.earnings_24h,
			earnings_7d: protocol.total7d ?? previous.earnings_7d,
			earnings_30d: protocol.total30d ?? previous.earnings_30d,
			earnings_1y: protocol.total1y ?? previous.earnings_1y,
			earningsChange_1d: protocol.change_1d ?? previous.earningsChange_1d,
			earningsChange_7d: protocol.change_7d ?? previous.earningsChange_7d,
			earningsChange_1m: protocol.change_1m ?? previous.earningsChange_1m,
			earningsByChain: mergeChainBreakdown(previous.earningsByChain, getChainBreakdown(protocol))
		}
	}

	const mergeVolumeDataset = (
		dataset: DimensionDatasetItem[] | undefined,
		assign: (protocol: IFormattedProtocol, item: DimensionDatasetItem) => IFormattedProtocol
	) => {
		for (const item of dataset ?? []) {
			const protocolName = item.name?.toLowerCase()
			if (!protocolName) continue
			if (!allProtocols[protocolName]) {
				allProtocols[protocolName] = { name: item.displayName ?? item.name } as IFormattedProtocol
			}
			allProtocols[protocolName] = assign(
				{
					...allProtocols[protocolName],
					chains: Array.from(new Set([...(allProtocols[protocolName].chains ?? []), ...(item.chains ?? [])]))
				},
				item
			)
		}
	}

	mergeVolumeDataset(aggregatorsData, (protocol, item) => ({
		...protocol,
		aggregators_volume_24h: item.total24h ?? protocol.aggregators_volume_24h,
		aggregators_volume_7d: item.total7d ?? protocol.aggregators_volume_7d,
		aggregators_volume_30d: item.total30d ?? protocol.aggregators_volume_30d,
		aggregators_volume_change_1d: item.change_1d ?? protocol.aggregators_volume_change_1d,
		aggregators_volume_change_7d: item.change_7d ?? protocol.aggregators_volume_change_7d,
		aggregatorsVolumeByChain: mergeChainBreakdown(protocol.aggregatorsVolumeByChain, item.chainBreakdown)
	}))

	mergeVolumeDataset(bridgeAggregatorsData, (protocol, item) => ({
		...protocol,
		bridge_aggregators_volume_24h: item.total24h ?? protocol.bridge_aggregators_volume_24h,
		bridge_aggregators_volume_7d: item.total7d ?? protocol.bridge_aggregators_volume_7d,
		bridge_aggregators_volume_30d: item.total30d ?? protocol.bridge_aggregators_volume_30d,
		bridge_aggregators_volume_change_1d: item.change_1d ?? protocol.bridge_aggregators_volume_change_1d,
		bridge_aggregators_volume_change_7d: item.change_7d ?? protocol.bridge_aggregators_volume_change_7d,
		bridgeAggregatorsVolumeByChain: mergeChainBreakdown(protocol.bridgeAggregatorsVolumeByChain, item.chainBreakdown)
	}))

	mergeVolumeDataset(optionsData, (protocol, item) => ({
		...protocol,
		options_volume_24h: item.total24h ?? protocol.options_volume_24h,
		options_volume_7d: item.total7d ?? protocol.options_volume_7d,
		options_volume_30d: item.total30d ?? protocol.options_volume_30d,
		options_volume_change_1d: item.change_1d ?? protocol.options_volume_change_1d,
		options_volume_change_7d: item.change_7d ?? protocol.options_volume_change_7d,
		optionsVolumeByChain: mergeChainBreakdown(protocol.optionsVolumeByChain, item.chainBreakdown)
	}))

	// Use for..in loop instead of Object.values() to avoid intermediate array
	const finalProtocols: IFormattedProtocol[] = []
	for (const key in allProtocols) {
		finalProtocols.push(allProtocols[key])
	}

	const totalSpot24h = finalProtocols.reduce((sum, protocol) => sum + (protocol.volume_24h ?? 0), 0)
	const totalSpot7d = finalProtocols.reduce((sum, protocol) => sum + (protocol.volume_7d ?? 0), 0)
	const totalPerps24h = finalProtocols.reduce((sum, protocol) => sum + (protocol.perps_volume_24h ?? 0), 0)
	const totalAggregators24h = finalProtocols.reduce((sum, protocol) => sum + (protocol.aggregators_volume_24h ?? 0), 0)
	const totalAggregators7d = finalProtocols.reduce((sum, protocol) => sum + (protocol.aggregators_volume_7d ?? 0), 0)
	const totalBridgeAggregators24h = finalProtocols.reduce(
		(sum, protocol) => sum + (protocol.bridge_aggregators_volume_24h ?? 0),
		0
	)
	const totalOptions24h = finalProtocols.reduce((sum, protocol) => sum + (protocol.options_volume_24h ?? 0), 0)

	const protocolsWithShares = finalProtocols.map((protocol) => ({
		...protocol,
		volumeDominance_24h:
			totalSpot24h > 0 && protocol.volume_24h
				? (protocol.volume_24h / totalSpot24h) * 100
				: protocol.volumeDominance_24h,
		volumeMarketShare7d:
			totalSpot7d > 0 && protocol.volume_7d ? (protocol.volume_7d / totalSpot7d) * 100 : protocol.volumeMarketShare7d,
		perps_volume_dominance_24h:
			totalPerps24h > 0 && protocol.perps_volume_24h
				? (protocol.perps_volume_24h / totalPerps24h) * 100
				: protocol.perps_volume_dominance_24h,
		aggregators_volume_dominance_24h:
			totalAggregators24h > 0 && protocol.aggregators_volume_24h
				? (protocol.aggregators_volume_24h / totalAggregators24h) * 100
				: protocol.aggregators_volume_dominance_24h,
		aggregators_volume_marketShare7d:
			totalAggregators7d > 0 && protocol.aggregators_volume_7d
				? (protocol.aggregators_volume_7d / totalAggregators7d) * 100
				: protocol.aggregators_volume_marketShare7d,
		bridge_aggregators_volume_dominance_24h:
			totalBridgeAggregators24h > 0 && protocol.bridge_aggregators_volume_24h
				? (protocol.bridge_aggregators_volume_24h / totalBridgeAggregators24h) * 100
				: protocol.bridge_aggregators_volume_dominance_24h,
		options_volume_dominance_24h:
			totalOptions24h > 0 && protocol.options_volume_24h
				? (protocol.options_volume_24h / totalOptions24h) * 100
				: protocol.options_volume_dominance_24h
	}))

	return (
		parentProtocols ? groupProtocols(protocolsWithShares, parentProtocols, noSubrows) : protocolsWithShares
	) as Array<IFormattedProtocol>
}

export const formatProtocolsList2 = ({
	protocols,
	extraTvlsEnabled,
	minTvl,
	maxTvl
}: {
	protocols: IProtocol[]
	extraTvlsEnabled: Record<string, boolean>
	minTvl: number | null
	maxTvl: number | null
}): IProtocol[] => {
	type TvlEntry = { tvl: number; tvlPrevDay: number; tvlPrevWeek: number; tvlPrevMonth: number }
	type MutableTvlEntry = {
		tvl: number | null
		tvlPrevDay: number | null
		tvlPrevWeek: number | null
		tvlPrevMonth: number | null
	}
	const nullTvlEntry: MutableTvlEntry = { tvl: null, tvlPrevDay: null, tvlPrevWeek: null, tvlPrevMonth: null }
	const coerceTvlDefaults = (entry: MutableTvlEntry): TvlEntry => ({
		tvl: entry.tvl ?? 0,
		tvlPrevDay: entry.tvlPrevDay ?? 0,
		tvlPrevWeek: entry.tvlPrevWeek ?? 0,
		tvlPrevMonth: entry.tvlPrevMonth ?? 0
	})

	// Use for..in loop instead of Object.values() for better performance
	let shouldModifyTvl = minTvl !== null || maxTvl !== null
	if (!shouldModifyTvl) {
		for (const key in extraTvlsEnabled) {
			if (extraTvlsEnabled[key]) {
				shouldModifyTvl = true
				break
			}
		}
	}

	if (!shouldModifyTvl) return protocols

	const addOrNull = (acc: number | null | undefined, value: number | null | undefined) => {
		if (acc == null || value == null) return null
		return acc + value
	}

	const getTvlEntry = (tvlRecord: Record<string, TvlEntry>, key: string): TvlEntry | undefined => tvlRecord[key]

	const processTvl = (tvlRecord: Record<string, TvlEntry>, base: MutableTvlEntry): MutableTvlEntry => {
		for (const tvlKey in tvlRecord) {
			if (extraTvlsEnabled[tvlKey] && tvlKey !== 'doublecounted' && tvlKey !== 'liquidstaking') {
				const entry = getTvlEntry(tvlRecord, tvlKey)
				if (entry) {
					base.tvl = addOrNull(base.tvl, entry.tvl)
					base.tvlPrevDay = addOrNull(base.tvlPrevDay, entry.tvlPrevDay)
					base.tvlPrevWeek = addOrNull(base.tvlPrevWeek, entry.tvlPrevWeek)
					base.tvlPrevMonth = addOrNull(base.tvlPrevMonth, entry.tvlPrevMonth)
				}
			}
		}
		return base
	}

	const final: IProtocol[] = []
	for (const protocol of protocols) {
		if (protocol.tvl == null) {
			if (minTvl === null && maxTvl === null) {
				final.push({ ...protocol })
			}
		} else {
			let strikeTvl = protocol.strikeTvl ?? false

			const defaultTvl: MutableTvlEntry = { ...(protocol.tvl?.default ?? nullTvlEntry) }

			if (strikeTvl && (extraTvlsEnabled['liquidstaking'] || extraTvlsEnabled['doublecounted'])) {
				strikeTvl = false
			}

			processTvl(protocol.tvl, defaultTvl)

			const tvlChange = {
				change1d: getPercentChange(defaultTvl.tvl, defaultTvl.tvlPrevDay),
				change7d: getPercentChange(defaultTvl.tvl, defaultTvl.tvlPrevWeek),
				change1m: getPercentChange(defaultTvl.tvl, defaultTvl.tvlPrevMonth)
			}

			const mcaptvl =
				protocol.mcap != null && defaultTvl.tvl
					? +(formatNum(+protocol.mcap.toFixed(2) / +defaultTvl.tvl.toFixed(2)) ?? 0)
					: null

			if (protocol.childProtocols) {
				const childProtocols: IProtocol['childProtocols'] = []
				for (const child of protocol.childProtocols) {
					let strikeTvl = child.strikeTvl ?? false

					const childDefaultTvl: MutableTvlEntry = { ...(child.tvl?.default ?? nullTvlEntry) }

					if (strikeTvl && (extraTvlsEnabled['liquidstaking'] || extraTvlsEnabled['doublecounted'])) {
						strikeTvl = false
					}

					if (child.tvl) {
						processTvl(child.tvl, childDefaultTvl)
					}

					const tvlChange = {
						change1d: getPercentChange(childDefaultTvl.tvl, childDefaultTvl.tvlPrevDay),
						change7d: getPercentChange(childDefaultTvl.tvl, childDefaultTvl.tvlPrevWeek),
						change1m: getPercentChange(childDefaultTvl.tvl, childDefaultTvl.tvlPrevMonth)
					}

					const mcaptvl =
						child.mcap != null && childDefaultTvl.tvl
							? +(formatNum(+child.mcap.toFixed(2) / +childDefaultTvl.tvl.toFixed(2)) ?? 0)
							: null

					if (
						(minTvl != null ? (childDefaultTvl.tvl ?? 0) >= minTvl : true) &&
						(maxTvl != null ? (childDefaultTvl.tvl ?? 0) <= maxTvl : true)
					) {
						const normalizedChildDefaultTvl = coerceTvlDefaults(childDefaultTvl)
						childProtocols.push({
							...child,
							strikeTvl,
							tvl: child.tvl == null ? null : ({ default: normalizedChildDefaultTvl } as IProtocol['tvl']),
							tvlChange,
							mcaptvl
						})
					}
				}
				if (
					(minTvl != null ? (defaultTvl.tvl ?? 0) >= minTvl : true) &&
					(maxTvl != null ? (defaultTvl.tvl ?? 0) <= maxTvl : true)
				) {
					const normalizedDefaultTvl = coerceTvlDefaults(defaultTvl)
					final.push({
						...protocol,
						strikeTvl,
						tvl: protocol.tvl == null ? null : ({ default: normalizedDefaultTvl } as IProtocol['tvl']),
						childProtocols,
						tvlChange,
						mcaptvl
					})
				}
			} else {
				if (
					(minTvl != null ? (defaultTvl.tvl ?? 0) >= minTvl : true) &&
					(maxTvl != null ? (defaultTvl.tvl ?? 0) <= maxTvl : true)
				) {
					const normalizedDefaultTvl = coerceTvlDefaults(defaultTvl)
					final.push({
						...protocol,
						strikeTvl,
						tvl: protocol.tvl == null ? null : ({ default: normalizedDefaultTvl } as IProtocol['tvl']),
						tvlChange,
						mcaptvl
					})
				}
			}
		}
	}

	return final
}
