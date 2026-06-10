import type { IProtocol } from '~/containers/ProtocolRankings/types'
import { getPercentChange } from '~/utils'
import type { IRecentProtocol } from './types'

interface TvlEntry {
	tvl: number
	tvlPrevDay: number
	tvlPrevWeek: number
	tvlPrevMonth: number
}

type TvlEntryKey = keyof TvlEntry
type MutableTvlEntry = Record<TvlEntryKey, number | null>

const TVL_ENTRY_KEYS: Array<TvlEntryKey> = ['tvl', 'tvlPrevDay', 'tvlPrevWeek', 'tvlPrevMonth']
const NON_ADDITIVE_TVL_KEYS = new Set(['doublecounted', 'liquidstaking'])

function addTvlValue(
	currentValue: number | null,
	extraValue: number | null | undefined,
	missingBaseMode: 'null' | 'zero'
) {
	if (extraValue == null) return currentValue
	if (currentValue == null) return missingBaseMode === 'zero' ? extraValue : null
	return currentValue + extraValue
}

function addEnabledProtocolExtraTvls({
	base,
	tvlRecord,
	extraTvlsEnabled,
	normalizeSettingKey,
	missingBaseMode
}: {
	base: MutableTvlEntry
	tvlRecord: Record<string, TvlEntry | undefined>
	extraTvlsEnabled: Record<string, boolean>
	normalizeSettingKey: boolean
	missingBaseMode: 'null' | 'zero'
}) {
	for (const tvlKey in tvlRecord) {
		const settingKey = normalizeSettingKey ? tvlKey.toLowerCase() : tvlKey
		if (!extraTvlsEnabled[settingKey] || NON_ADDITIVE_TVL_KEYS.has(tvlKey)) continue

		const entry = tvlRecord[tvlKey]
		if (!entry) continue

		for (const field of TVL_ENTRY_KEYS) {
			base[field] = addTvlValue(base[field], entry[field], missingBaseMode)
		}
	}

	return base
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
		const tvlEntry = addEnabledProtocolExtraTvls({
			base: {
				tvl: protocol.tvl,
				tvlPrevDay: protocol.tvlPrevDay ?? null,
				tvlPrevWeek: protocol.tvlPrevWeek ?? null,
				tvlPrevMonth: protocol.tvlPrevMonth ?? null
			},
			tvlRecord: protocol.extraTvl,
			extraTvlsEnabled,
			normalizeSettingKey: true,
			missingBaseMode: 'zero'
		})

		let finalTvl = tvlEntry.tvl
		let finalTvlPrevDay = tvlEntry.tvlPrevDay
		let finalTvlPrevWeek = tvlEntry.tvlPrevWeek
		let finalTvlPrevMonth = tvlEntry.tvlPrevMonth

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
	type MutableProtocolTvlEntry = MutableTvlEntry
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

	const processTvl = (
		tvlRecord: Record<string, ProtocolTvlEntry>,
		base: MutableProtocolTvlEntry
	): MutableProtocolTvlEntry =>
		addEnabledProtocolExtraTvls({
			base,
			tvlRecord,
			extraTvlsEnabled,
			normalizeSettingKey: false,
			missingBaseMode: 'null'
		})

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
