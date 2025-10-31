import { IOverviewProps } from '~/api/categories/adaptors'
import { ChainMetricSnapshot, IFormattedProtocol, IParentProtocol, TCompressedChain } from '~/api/types'
import { removedCategoriesFromChainTvlSet } from '~/constants'
import { IChainAsset, IChainAssets, IProtocol } from '~/containers/ChainOverview/types'
import { getDominancePercent, getPercentChange } from '~/utils'
import { groupProtocols } from './utils'

interface IData {
	tvl: number
	tvlPrevDay: number
	tvlPrevWeek: number
	tvlPrevMonth: number
	extraTvl?: {
		[key: string]: { tvl: number; tvlPrevDay: number; tvlPrevWeek: number; tvlPrevMonth: number }
	}
	mcap?: number
	name: string
}

interface IFormattedDataWithExtraTvlProps {
	data: Readonly<Array<IData>>
	defaultSortingColumn?: string
	dir?: string
	applyLqAndDc?: boolean
	extraTvlsEnabled: Record<string, boolean>
	chainAssets?: IChainAssets
}

export interface IFormattedDataWithExtraTvl {
	chainAssets?: IChainAsset | null
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
		chainAssets?: IChainAsset | null
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

export function formatDataWithExtraTvls({
	data,
	defaultSortingColumn,
	dir,
	applyLqAndDc,
	extraTvlsEnabled,
	chainAssets
}: IFormattedDataWithExtraTvlProps): Array<IFormattedDataWithExtraTvl> {
	const updatedProtocols = data.map(({ tvl, tvlPrevDay, tvlPrevWeek, tvlPrevMonth, extraTvl, mcap, ...props }) => {
		let finalTvl: number | null = tvl
		let finalTvlPrevDay: number | null = tvlPrevDay
		let finalTvlPrevWeek: number | null = tvlPrevWeek
		let finalTvlPrevMonth: number | null = tvlPrevMonth

		// if (props.name === 'Ethereum') {
		// 	const initialTvl = tvl
		// 	const doublecounted = extraTvl['doublecounted'].tvl
		// 	const liquidstaking = extraTvl['liquidstaking'].tvl
		// 	const overlap = extraTvl['dcandlsoverlap'].tvl
		// 	console.log(['doublecounted', 'liquidstaking', 'total'])
		// 	console.log(['on', 'on', initialTvl])
		// 	console.log(['on', 'off', initialTvl - liquidstaking + overlap])
		// 	console.log(['off', 'on', initialTvl - doublecounted + overlap])
		// 	console.log(['off', 'off', initialTvl - doublecounted - liquidstaking + overlap])
		// }

		Object.entries(extraTvl).forEach(([prop, propValues]) => {
			const { tvl, tvlPrevDay, tvlPrevWeek, tvlPrevMonth } = propValues

			if (applyLqAndDc && prop === 'doublecounted' && !extraTvlsEnabled['doublecounted']) {
				tvl && (finalTvl = (finalTvl || 0) - tvl)
				tvlPrevDay && (finalTvlPrevDay = (finalTvlPrevDay || 0) - tvlPrevDay)
				tvlPrevWeek && (finalTvlPrevWeek = (finalTvlPrevWeek || 0) - tvlPrevWeek)
				tvlPrevMonth && (finalTvlPrevMonth = (finalTvlPrevMonth || 0) - tvlPrevMonth)
			}

			if (applyLqAndDc && prop === 'liquidstaking' && !extraTvlsEnabled['liquidstaking']) {
				tvl && (finalTvl = (finalTvl || 0) - tvl)
				tvlPrevDay && (finalTvlPrevDay = (finalTvlPrevDay || 0) - tvlPrevDay)
				tvlPrevWeek && (finalTvlPrevWeek = (finalTvlPrevWeek || 0) - tvlPrevWeek)
				tvlPrevMonth && (finalTvlPrevMonth = (finalTvlPrevMonth || 0) - tvlPrevMonth)
			}

			if (applyLqAndDc && prop.toLowerCase() === 'dcandlsoverlap') {
				if (!extraTvlsEnabled['doublecounted'] || !extraTvlsEnabled['liquidstaking']) {
					tvl && (finalTvl = (finalTvl || 0) + tvl)
					tvlPrevDay && (finalTvlPrevDay = (finalTvlPrevDay || 0) + tvlPrevDay)
					tvlPrevWeek && (finalTvlPrevWeek = (finalTvlPrevWeek || 0) + tvlPrevWeek)
					tvlPrevMonth && (finalTvlPrevMonth = (finalTvlPrevMonth || 0) + tvlPrevMonth)
				}
			}

			// convert to lowercase as server response is not consistent in extra-tvl names
			if (extraTvlsEnabled[prop.toLowerCase()] && prop !== 'doublecounted' && prop !== 'liquidstaking') {
				// check if final tvls are null, if they are null and tvl exist on selected option, convert to 0 and add them
				tvl && (finalTvl = (finalTvl || 0) + tvl)
				tvlPrevDay && (finalTvlPrevDay = (finalTvlPrevDay || 0) + tvlPrevDay)
				tvlPrevWeek && (finalTvlPrevWeek = (finalTvlPrevWeek || 0) + tvlPrevWeek)
				tvlPrevMonth && (finalTvlPrevMonth = (finalTvlPrevMonth || 0) + tvlPrevMonth)
			}
		})

		let change1d: number | null = getPercentChange(finalTvl, finalTvlPrevDay)
		let change7d: number | null = getPercentChange(finalTvl, finalTvlPrevWeek)
		let change1m: number | null = getPercentChange(finalTvl, finalTvlPrevMonth)

		const mcaptvl = mcap && finalTvl ? +(+(mcap / finalTvl).toFixed(2)) : null

		let assets = null

		if (chainAssets && props.name && chainAssets[props.name]) {
			let total = chainAssets[props.name].total?.total.split('.')[0] ?? null
			const ownTokens = chainAssets[props.name].ownTokens?.total.split('.')[0] ?? null
			const canonical = chainAssets[props.name].canonical?.total.split('.')[0] ?? null
			const native = chainAssets[props.name].native?.total.split('.')[0] ?? null
			const thirdParty = chainAssets[props.name].thirdParty?.total.split('.')[0] ?? null

			assets = {
				total: extraTvlsEnabled.govtokens && ownTokens ? +(total ?? 0) + +ownTokens : total,
				ownTokens: ownTokens == '0' ? null : ownTokens,
				canonical: canonical == '0' ? null : canonical,
				native: native == '0' ? null : native,
				thirdParty: thirdParty == '0' ? null : thirdParty
			}
		}

		return {
			...props,
			chainAssets: assets,
			tvl: finalTvl < 0 ? 0 : finalTvl,
			tvlPrevDay: finalTvlPrevDay < 0 ? 0 : finalTvlPrevDay,
			tvlPrevWeek: finalTvlPrevWeek < 0 ? 0 : finalTvlPrevWeek,
			tvlPrevMonth: finalTvlPrevMonth < 0 ? 0 : finalTvlPrevMonth,
			change_1d: change1d,
			change_7d: change7d,
			change_1m: change1m,
			mcap,
			mcaptvl: mcaptvl ?? undefined
		}
	})

	if (defaultSortingColumn === undefined) {
		return updatedProtocols.sort((a, b) => b.tvl - a.tvl)
	} else {
		return updatedProtocols.sort((a, b) => {
			if (dir === 'asc') {
				return a[defaultSortingColumn] - b[defaultSortingColumn]
			} else return b[defaultSortingColumn] - a[defaultSortingColumn]
		})
	}
}

interface IGroupTvlsByDay {
	chains: Readonly<Array<TCompressedChain>>
	tvlTypes: any
	extraTvlsEnabled: Record<string, boolean>
}

interface IChainTvl {
	[key: string]: number
}

type ChainTvlsByDay = [string, IChainTvl]

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
	chainBreakdown?: Record<string, any>
}

export function groupDataWithTvlsByDay({ chains, tvlTypes, extraTvlsEnabled }: IGroupTvlsByDay) {
	let extraTvls = { ...extraTvlsEnabled }

	let tvlKey = 'tvl'
	if (tvlTypes !== null) {
		tvlKey = tvlTypes[tvlKey]
		extraTvls = Object.fromEntries(Object.entries(extraTvls).map(([toggle, val]) => [tvlTypes[toggle], val]))
	}

	const daySum = {}

	const chainsWithExtraTvlsByDay = chains.map(([date, values]) => {
		const tvls: IChainTvl = {}
		let totalDaySum = 0

		Object.entries(values).forEach(([name, chainTvls]: ChainTvlsByDay) => {
			let sum = chainTvls[tvlKey]
			totalDaySum += chainTvls[tvlKey] || 0

			for (const c in chainTvls) {
				if ((c === 'doublecounted' || c === 'd') && !extraTvls['doublecounted']) {
					sum -= chainTvls[c]
					totalDaySum -= chainTvls[c]
				}

				if ((c === 'liquidstaking' || c === 'l') && !extraTvls['liquidstaking']) {
					sum -= chainTvls[c]
					totalDaySum -= chainTvls[c]
				}

				if (c.toLowerCase() === 'dcandlsoverlap' || c === 'dl') {
					if (!extraTvls['doublecounted'] || !extraTvls['liquidstaking']) {
						sum += chainTvls[c]
						totalDaySum += chainTvls[c]
					}
				}

				if (extraTvls[c.toLowerCase()] && c !== 'doublecounted' && c !== 'liquidstaking') {
					sum += chainTvls[c]
					totalDaySum += chainTvls[c]
				}
			}

			tvls[name] = sum
		})

		daySum[date] = totalDaySum

		return { date: Number(date), ...tvls }
	})

	const chainsWithExtraTvlsAndDominanceByDay = chainsWithExtraTvlsByDay.map(({ date, ...values }) => {
		const shares = {}

		for (const value in values) {
			shares[value] = getDominancePercent(values[value], daySum[date])
		}

		return { date, ...shares }
	})

	return { chainsWithExtraTvlsByDay, chainsWithExtraTvlsAndDominanceByDay }
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
		incoming?: Record<string, any>
	): Record<string, ChainMetricSnapshot> | undefined => {
		if (!incoming) return existing
		const next: Record<string, ChainMetricSnapshot> = { ...(existing ?? {}) }
		Object.entries(incoming).forEach(([key, rawValue]) => {
			if (!rawValue) return
			const value = rawValue as ChainMetricSnapshot & { chain?: string }
			const chainLabel =
				typeof value.chain === 'string' && value.chain.trim().length ? value.chain : key
			const normalizedKey =
				typeof chainLabel === 'string' && chainLabel.trim().length
					? chainLabel.trim().toLowerCase()
					: key.trim().toLowerCase()
			next[normalizedKey] = {
				...value,
				chain: chainLabel
			}
		})
		return next
	}

	const allProtocols: Record<string, IFormattedProtocol> = {}

	const shouldModifyTvl = Object.values(checkExtras).some((t) => t)

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

			if (removedCategoriesFromChainTvlSet.has(props.category)) {
				strikeTvl = true
			}

			Object.entries(extraTvl).forEach(([prop, propValues]) => {
				const { tvl, tvlPrevDay, tvlPrevWeek, tvlPrevMonth } = propValues
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
						tvl && (finalTvl = (finalTvl || 0) + tvl)
						tvlPrevDay && (finalTvlPrevDay = (finalTvlPrevDay || 0) + tvlPrevDay)
						tvlPrevWeek && (finalTvlPrevWeek = (finalTvlPrevWeek || 0) + tvlPrevWeek)
						tvlPrevMonth && (finalTvlPrevMonth = (finalTvlPrevMonth || 0) + tvlPrevMonth)
					}
				}
			})
		}

		let change1d: number | null = getPercentChange(finalTvl, finalTvlPrevDay)
		let change7d: number | null = getPercentChange(finalTvl, finalTvlPrevWeek)
		let change1m: number | null = getPercentChange(finalTvl, finalTvlPrevMonth)

		const mcaptvl = mcap && finalTvl ? +(+(mcap / finalTvl).toFixed(2)) : null

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
			mcaptvl: mcaptvl ?? undefined,
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
			feesByChain: mergeChainBreakdown(previous.feesByChain, protocol.chainBreakdown),
			revenueByChain: mergeChainBreakdown(previous.revenueByChain, protocol.chainBreakdown)
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
			volumeChange_7d: protocol.change_7d ?? protocol['change_7dover7d'] ?? previous.volumeChange_7d,
			volumeChange_1m: protocol.change_1m ?? previous.volumeChange_1m,
			cumulativeVolume: protocol.totalAllTime ?? previous.cumulativeVolume,
			volumeByChain: mergeChainBreakdown(previous.volumeByChain, protocol.chainBreakdown)
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
			perps_volume_change_7d:
				protocol.change_7d ?? protocol['change_7dover7d'] ?? previous.perps_volume_change_7d,
			perps_volume_change_1m: protocol.change_1m ?? previous.perps_volume_change_1m,
			perpsVolumeByChain: mergeChainBreakdown(previous.perpsVolumeByChain, protocol.chainBreakdown)
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
			openInterestByChain: mergeChainBreakdown(previous.openInterestByChain, protocol.chainBreakdown)
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
			earnings_1y: (protocol as any)?.total1y ?? previous.earnings_1y,
			earningsChange_1d: protocol.change_1d ?? previous.earningsChange_1d,
			earningsChange_7d: protocol.change_7d ?? previous.earningsChange_7d,
			earningsChange_1m: protocol.change_1m ?? previous.earningsChange_1m,
			earningsByChain: mergeChainBreakdown(previous.earningsByChain, protocol.chainBreakdown)
		}
	}

	const mergeVolumeDataset = (
		dataset: DimensionDatasetItem[] | undefined,
		assign: (protocol: IFormattedProtocol, item: DimensionDatasetItem) => IFormattedProtocol
	) =>
		(dataset ?? []).forEach((item) => {
			const protocolName = item.name?.toLowerCase()
			if (!protocolName) return
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
		})

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

	const finalProtocols = Object.values(allProtocols)

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
	const shouldModifyTvl = Object.values(extraTvlsEnabled).some((t) => t) || minTvl !== null || maxTvl !== null

	if (!shouldModifyTvl) return protocols

	const final = []
	for (const protocol of protocols) {
		if (!protocol.tvl) {
			if (minTvl === null && maxTvl === null) {
				final.push({ ...protocol })
			}
		} else {
			let strikeTvl = protocol.strikeTvl ?? false

			let defaultTvl = { ...(protocol.tvl?.default ?? ({} as any)) }

			if (strikeTvl && (extraTvlsEnabled['liquidstaking'] || extraTvlsEnabled['doublecounted'])) {
				strikeTvl = false
			}
			for (const tvlKey in protocol.tvl) {
				// if tvlKey is doublecounted or liquidstaking just strike tvl but do not add them
				if (extraTvlsEnabled[tvlKey] && tvlKey !== 'doublecounted' && tvlKey !== 'liquidstaking') {
					defaultTvl.tvl = (defaultTvl.tvl || 0) + protocol.tvl[tvlKey].tvl
					defaultTvl.tvlPrevDay = (defaultTvl.tvlPrevDay || 0) + protocol.tvl[tvlKey].tvlPrevDay
					defaultTvl.tvlPrevWeek = (defaultTvl.tvlPrevWeek || 0) + protocol.tvl[tvlKey].tvlPrevWeek
					defaultTvl.tvlPrevMonth = (defaultTvl.tvlPrevMonth || 0) + protocol.tvl[tvlKey].tvlPrevMonth
				}
			}

			const tvlChange = {
				change1d: getPercentChange(defaultTvl.tvl, defaultTvl.tvlPrevDay),
				change7d: getPercentChange(defaultTvl.tvl, defaultTvl.tvlPrevWeek),
				change1m: getPercentChange(defaultTvl.tvl, defaultTvl.tvlPrevMonth)
			}

			const mcaptvl =
				protocol.mcap && defaultTvl.tvl ? +(+(+protocol.mcap.toFixed(2) / +defaultTvl.tvl.toFixed(2)).toFixed(2)) : null

			if (protocol.childProtocols) {
				const childProtocols = []
				for (const child of protocol.childProtocols) {
					let strikeTvl = child.strikeTvl ?? false

					let defaultTvl = { ...(child.tvl?.default ?? ({} as any)) }

					if (strikeTvl && (extraTvlsEnabled['liquidstaking'] || extraTvlsEnabled['doublecounted'])) {
						strikeTvl = false
					}
					for (const tvlKey in child.tvl) {
						// if tvlKey is doublecounted or liquidstaking just strike tvl but do not add them
						if (extraTvlsEnabled[tvlKey] && tvlKey !== 'doublecounted' && tvlKey !== 'liquidstaking') {
							defaultTvl.tvl = (defaultTvl.tvl || 0) + child.tvl[tvlKey].tvl
							defaultTvl.tvlPrevDay = (defaultTvl.tvlPrevDay || 0) + child.tvl[tvlKey].tvlPrevDay
							defaultTvl.tvlPrevWeek = (defaultTvl.tvlPrevWeek || 0) + child.tvl[tvlKey].tvlPrevWeek
							defaultTvl.tvlPrevMonth = (defaultTvl.tvlPrevMonth || 0) + child.tvl[tvlKey].tvlPrevMonth
						}
					}
					const tvlChange = {
						change1d: getPercentChange(defaultTvl.tvl, defaultTvl.tvlPrevDay),
						change7d: getPercentChange(defaultTvl.tvl, defaultTvl.tvlPrevWeek),
						change1m: getPercentChange(defaultTvl.tvl, defaultTvl.tvlPrevMonth)
					}

					const mcaptvl = child.mcap && defaultTvl.tvl ? +(+(child.mcap / defaultTvl.tvl).toFixed(2)) : null

					if ((minTvl ? defaultTvl.tvl >= minTvl : true) && (maxTvl ? defaultTvl.tvl <= maxTvl : true)) {
						childProtocols.push({ ...child, strikeTvl, tvl: { default: defaultTvl }, tvlChange, mcaptvl })
					}
				}
				if ((minTvl ? defaultTvl.tvl >= minTvl : true) && (maxTvl ? defaultTvl.tvl <= maxTvl : true)) {
					final.push({ ...protocol, strikeTvl, tvl: { default: defaultTvl }, childProtocols, tvlChange, mcaptvl })
				}
			} else {
				if ((minTvl ? defaultTvl.tvl >= minTvl : true) && (maxTvl ? defaultTvl.tvl <= maxTvl : true)) {
					final.push({ ...protocol, strikeTvl, tvl: { default: defaultTvl }, tvlChange, mcaptvl })
				}
			}
		}
	}

	return final
}
