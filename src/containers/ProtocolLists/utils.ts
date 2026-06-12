import type { IProtocol } from '~/containers/ProtocolRankings/types'
import { getPercentChange } from '~/utils'
import type { IRecentProtocol } from './types'

interface TvlEntry {
	tvl: number | null
	tvlPrevDay: number | null
	tvlPrevWeek: number | null
	tvlPrevMonth: number | null
}

type TvlEntryKey = keyof TvlEntry
type MutableTvlEntry = Record<TvlEntryKey, number | null>

const TVL_ENTRY_KEYS: Array<TvlEntryKey> = ['tvl', 'tvlPrevDay', 'tvlPrevWeek', 'tvlPrevMonth']
const NON_ADDITIVE_TVL_KEYS = new Set(['doublecounted', 'liquidstaking'])

function getMcapTvl(mcap: number | null, tvl: number | null | undefined): number | null {
	if (mcap == null || !tvl) return null

	// This is derived arithmetic: numeric API fields can still produce non-finite ratios.
	const ratio = mcap / tvl
	return Number.isFinite(ratio) ? +ratio.toFixed(2) : null
}

function isAdditiveTvlKey(tvlKey: string, extraTvlsEnabled: Record<string, boolean>, normalizeSettingKey: boolean) {
	const settingKey = normalizeSettingKey ? tvlKey.toLowerCase() : tvlKey
	return !!extraTvlsEnabled[settingKey] && !NON_ADDITIVE_TVL_KEYS.has(settingKey)
}

function addRecentProtocolExtraTvls({
	base,
	tvlRecord,
	extraTvlsEnabled
}: {
	base: MutableTvlEntry
	tvlRecord: Record<string, TvlEntry | undefined>
	extraTvlsEnabled: Record<string, boolean>
}) {
	for (const tvlKey in tvlRecord) {
		if (!isAdditiveTvlKey(tvlKey, extraTvlsEnabled, true)) continue

		const entry = tvlRecord[tvlKey]
		if (!entry) continue

		for (const field of TVL_ENTRY_KEYS) {
			const extraValue = entry[field]
			if (extraValue != null) {
				base[field] = (base[field] ?? 0) + extraValue
			}
		}
	}

	return base
}

function addProtocolRankingExtraTvls({
	base,
	tvlRecord,
	extraTvlsEnabled
}: {
	base: MutableTvlEntry
	tvlRecord: Record<string, TvlEntry | undefined>
	extraTvlsEnabled: Record<string, boolean>
}) {
	for (const tvlKey in tvlRecord) {
		if (!isAdditiveTvlKey(tvlKey, extraTvlsEnabled, false)) continue

		const entry = tvlRecord[tvlKey]
		if (!entry) continue

		for (const field of TVL_ENTRY_KEYS) {
			if (base[field] != null) {
				base[field] += entry[field] ?? 0
			}
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
		const tvlEntry = addRecentProtocolExtraTvls({
			base: {
				tvl: protocol.tvl,
				tvlPrevDay: protocol.tvlPrevDay ?? null,
				tvlPrevWeek: protocol.tvlPrevWeek ?? null,
				tvlPrevMonth: protocol.tvlPrevMonth ?? null
			},
			tvlRecord: protocol.extraTvl,
			extraTvlsEnabled
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

		const mcaptvl = getMcapTvl(protocol.mcap ?? null, finalTvl)

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
	const nullTvlEntry: MutableTvlEntry = { tvl: null, tvlPrevDay: null, tvlPrevWeek: null, tvlPrevMonth: null }
	const normalizeTvlDefaults = (entry: MutableTvlEntry): TvlEntry => ({
		tvl: entry.tvl ?? 0,
		tvlPrevDay: entry.tvlPrevDay,
		tvlPrevWeek: entry.tvlPrevWeek,
		tvlPrevMonth: entry.tvlPrevMonth
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

	const processTvl = (tvlRecord: Record<string, TvlEntry>, base: MutableTvlEntry): MutableTvlEntry =>
		addProtocolRankingExtraTvls({
			base,
			tvlRecord,
			extraTvlsEnabled
		})

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

			const mcaptvl = getMcapTvl(protocol.mcap, defaultTvl.tvl)

			if (protocol.childProtocols) {
				const childProtocols: IProtocol['childProtocols'] = []
				for (const child of protocol.childProtocols) {
					let childStrikeTvl = child.strikeTvl ?? false
					const childDefaultTvl: MutableTvlEntry = { ...(child.tvl?.default ?? nullTvlEntry) }

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

					const childMcapTvl = getMcapTvl(child.mcap, childDefaultTvl.tvl)

					if (
						(minTvl != null ? (childDefaultTvl.tvl ?? 0) >= minTvl : true) &&
						(maxTvl != null ? (childDefaultTvl.tvl ?? 0) <= maxTvl : true)
					) {
						const normalizedChildDefaultTvl = normalizeTvlDefaults(childDefaultTvl)
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
					const normalizedDefaultTvl = normalizeTvlDefaults(defaultTvl)
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
					const normalizedDefaultTvl = normalizeTvlDefaults(defaultTvl)
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
