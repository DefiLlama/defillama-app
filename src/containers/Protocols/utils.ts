import type { IProtocol } from '~/containers/ChainOverview/types'
import { getAnnualizedRatio, getPercentChange } from '~/utils'
import type { IRecentProtocol } from './types'

interface TvlEntry {
	tvl: number
	tvlPrevDay: number
	tvlPrevWeek: number
	tvlPrevMonth: number
}

/**
 * Apply extraTvl toggles (staking, pool2, borrowed, etc.) to protocol TVL values.
 * `extraTvlsEnabled` comes from `useLocalStorageSettingsManager('tvl')`.
 */
export function applyExtraTvl(
	protocols: ReadonlyArray<IRecentProtocol>,
	extraTvlsEnabled: Record<string, boolean>
): Array<
	IRecentProtocol & {
		change_1d: number | null
		change_7d: number | null
		change_1m: number | null
		mcaptvl: number | null
	}
> {
	return protocols.map((protocol) => {
		let finalTvl: number | null = protocol.tvl
		let finalTvlPrevDay: number | null = protocol.tvlPrevDay ?? null
		let finalTvlPrevWeek: number | null = protocol.tvlPrevWeek ?? null
		let finalTvlPrevMonth: number | null = protocol.tvlPrevMonth ?? null

		for (const prop in protocol.extraTvl) {
			const entry: TvlEntry | undefined = protocol.extraTvl[prop]
			if (!entry) continue

			const { tvl, tvlPrevDay, tvlPrevWeek, tvlPrevMonth } = entry

			// doublecounted/liquidstaking subtraction logic (applyLqAndDc=false for recent protocols)
			// Not applied here since RecentProtocols doesn't use applyLqAndDc

			// Add extra TVL if the toggle is enabled (convert key to lowercase for consistency)
			if (extraTvlsEnabled[prop.toLowerCase()] && prop !== 'doublecounted' && prop !== 'liquidstaking') {
				if (tvl != null) {
					finalTvl = (finalTvl ?? 0) + tvl
				}
				if (tvlPrevDay != null) {
					finalTvlPrevDay = (finalTvlPrevDay ?? 0) + tvlPrevDay
				}
				if (tvlPrevWeek != null) {
					finalTvlPrevWeek = (finalTvlPrevWeek ?? 0) + tvlPrevWeek
				}
				if (tvlPrevMonth != null) {
					finalTvlPrevMonth = (finalTvlPrevMonth ?? 0) + tvlPrevMonth
				}
			}
		}

		// Clamp negative values to 0
		if (finalTvl != null && finalTvl < 0) finalTvl = 0
		if (finalTvlPrevDay != null && finalTvlPrevDay < 0) finalTvlPrevDay = 0
		if (finalTvlPrevWeek != null && finalTvlPrevWeek < 0) finalTvlPrevWeek = 0
		if (finalTvlPrevMonth != null && finalTvlPrevMonth < 0) finalTvlPrevMonth = 0

		const mcapNum = protocol.mcap ?? null
		const tvlNum = finalTvl ?? 0
		const mcaptvl = mcapNum != null && tvlNum !== 0 ? +(mcapNum / tvlNum).toFixed(2) : null

		return {
			...protocol,
			tvl: finalTvl ?? 0,
			tvlPrevDay: finalTvlPrevDay ?? 0,
			tvlPrevWeek: finalTvlPrevWeek ?? 0,
			tvlPrevMonth: finalTvlPrevMonth ?? 0,
			change_1d: getPercentChange(finalTvl, finalTvlPrevDay),
			change_7d: getPercentChange(finalTvl, finalTvlPrevWeek),
			change_1m: getPercentChange(finalTvl, finalTvlPrevMonth),
			mcaptvl
		}
	})
}

export const applyProtocolTvlSettings = ({
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
	type ProtocolTvlEntry = { tvl: number; tvlPrevDay: number; tvlPrevWeek: number; tvlPrevMonth: number }
	type MutableProtocolTvlEntry = {
		tvl: number | null
		tvlPrevDay: number | null
		tvlPrevWeek: number | null
		tvlPrevMonth: number | null
	}
	const nullTvlEntry: MutableProtocolTvlEntry = { tvl: null, tvlPrevDay: null, tvlPrevWeek: null, tvlPrevMonth: null }
	const coerceTvlDefaults = (entry: MutableProtocolTvlEntry): ProtocolTvlEntry => ({
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

	const getTvlEntry = (tvlRecord: Record<string, ProtocolTvlEntry>, key: string): ProtocolTvlEntry | undefined =>
		tvlRecord[key]

	const processTvl = (
		tvlRecord: Record<string, ProtocolTvlEntry>,
		base: MutableProtocolTvlEntry
	): MutableProtocolTvlEntry => {
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
			const defaultTvl: MutableProtocolTvlEntry = { ...(protocol.tvl?.default ?? nullTvlEntry) }

			if (strikeTvl && (extraTvlsEnabled['liquidstaking'] || extraTvlsEnabled['doublecounted'])) {
				strikeTvl = false
			}

			processTvl(protocol.tvl, defaultTvl)

			const tvlChange = {
				change1d: getPercentChange(defaultTvl.tvl, defaultTvl.tvlPrevDay),
				change7d: getPercentChange(defaultTvl.tvl, defaultTvl.tvlPrevWeek),
				change1m: getPercentChange(defaultTvl.tvl, defaultTvl.tvlPrevMonth)
			}

			const mcaptvl = protocol.mcap != null && defaultTvl.tvl ? +(protocol.mcap / defaultTvl.tvl).toFixed(2) : null

			if (protocol.childProtocols) {
				const childProtocols: IProtocol['childProtocols'] = []
				for (const child of protocol.childProtocols) {
					let childStrikeTvl = child.strikeTvl ?? false
					const childDefaultTvl: MutableProtocolTvlEntry = { ...(child.tvl?.default ?? nullTvlEntry) }

					if (childStrikeTvl && (extraTvlsEnabled['liquidstaking'] || extraTvlsEnabled['doublecounted'])) {
						childStrikeTvl = false
					}

					if (child.tvl) {
						processTvl(child.tvl, childDefaultTvl)
					}

					const childTvlChange = {
						change1d: getPercentChange(childDefaultTvl.tvl, childDefaultTvl.tvlPrevDay),
						change7d: getPercentChange(childDefaultTvl.tvl, childDefaultTvl.tvlPrevWeek),
						change1m: getPercentChange(childDefaultTvl.tvl, childDefaultTvl.tvlPrevMonth)
					}

					const childMcapTvl =
						child.mcap != null && childDefaultTvl.tvl ? +(child.mcap / childDefaultTvl.tvl).toFixed(2) : null

					if (
						(minTvl != null ? (childDefaultTvl.tvl ?? 0) >= minTvl : true) &&
						(maxTvl != null ? (childDefaultTvl.tvl ?? 0) <= maxTvl : true)
					) {
						const normalizedChildDefaultTvl = coerceTvlDefaults(childDefaultTvl)
						childProtocols.push({
							...child,
							strikeTvl: childStrikeTvl,
							tvl: child.tvl == null ? null : ({ default: normalizedChildDefaultTvl } as IProtocol['tvl']),
							tvlChange: childTvlChange,
							mcaptvl: childMcapTvl
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

type FeeSettings = {
	bribes?: boolean
	tokentax?: boolean
}

type FeeTotals = {
	total24h: number | null
	total7d: number | null
	total30d: number | null
	total1y?: number | null
	monthlyAverage1y?: number | null
	totalAllTime: number | null
}

const addFeeValue = (base: number | null | undefined, extra: number) => {
	if (base != null) return base + extra
	return extra !== 0 ? extra : null
}

const hasFeeTotals = (totals: FeeTotals | null | undefined) =>
	totals?.total24h != null ||
	totals?.total7d != null ||
	totals?.total30d != null ||
	totals?.total1y != null ||
	totals?.monthlyAverage1y != null ||
	totals?.totalAllTime != null

const applyExtraFeeTotals = <T extends FeeTotals | undefined>({
	base,
	bribeRevenue,
	tokenTax,
	extraFeesEnabled
}: {
	base: T
	bribeRevenue: FeeTotals | null | undefined
	tokenTax: FeeTotals | null | undefined
	extraFeesEnabled: FeeSettings
}): T => {
	const bribes = extraFeesEnabled.bribes ? bribeRevenue : null
	const taxes = extraFeesEnabled.tokentax ? tokenTax : null

	if (!hasFeeTotals(base) && !hasFeeTotals(bribes) && !hasFeeTotals(taxes)) {
		return base
	}

	const adjusted = {
		...(base ?? {}),
		total24h: addFeeValue(base?.total24h, (bribes?.total24h ?? 0) + (taxes?.total24h ?? 0)),
		total7d: addFeeValue(base?.total7d, (bribes?.total7d ?? 0) + (taxes?.total7d ?? 0)),
		total30d: addFeeValue(base?.total30d, (bribes?.total30d ?? 0) + (taxes?.total30d ?? 0)),
		total1y: addFeeValue(base?.total1y, (bribes?.total1y ?? 0) + (taxes?.total1y ?? 0)),
		monthlyAverage1y: addFeeValue(
			base?.monthlyAverage1y,
			(bribes?.monthlyAverage1y ?? 0) + (taxes?.monthlyAverage1y ?? 0)
		),
		totalAllTime: addFeeValue(base?.totalAllTime, (bribes?.totalAllTime ?? 0) + (taxes?.totalAllTime ?? 0))
	} as T

	return adjusted
}

const applyProtocolFeeExtras = (protocol: IProtocol, extraFeesEnabled: FeeSettings): IProtocol => {
	const fees = applyExtraFeeTotals({
		base: protocol.fees,
		bribeRevenue: protocol.bribeRevenue,
		tokenTax: protocol.tokenTax,
		extraFeesEnabled
	})
	const revenue = applyExtraFeeTotals({
		base: protocol.revenue,
		bribeRevenue: protocol.bribeRevenue,
		tokenTax: protocol.tokenTax,
		extraFeesEnabled
	})
	const holdersRevenue = applyExtraFeeTotals({
		base: protocol.holdersRevenue,
		bribeRevenue: protocol.bribeRevenue,
		tokenTax: protocol.tokenTax,
		extraFeesEnabled
	})

	if (fees) {
		fees.pf = getAnnualizedRatio(protocol.mcap, fees.total30d)
	}

	if (revenue) {
		revenue.ps = getAnnualizedRatio(protocol.mcap, revenue.total30d)
	}

	const childProtocols = protocol.childProtocols?.map((child) => applyProtocolFeeExtras(child, extraFeesEnabled))

	return {
		...protocol,
		...(fees ? { fees } : {}),
		...(revenue ? { revenue } : {}),
		...(holdersRevenue ? { holdersRevenue } : {}),
		...(childProtocols ? { childProtocols } : {})
	}
}

export const applyProtocolFeeSettings = ({
	protocols,
	extraFeesEnabled
}: {
	protocols: IProtocol[]
	extraFeesEnabled: FeeSettings
}): IProtocol[] => {
	if (!extraFeesEnabled.bribes && !extraFeesEnabled.tokentax) {
		return protocols
	}

	return protocols.map((protocol) => applyProtocolFeeExtras(protocol, extraFeesEnabled))
}
