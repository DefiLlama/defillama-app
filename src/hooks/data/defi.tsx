import type { IProtocol } from '~/containers/ChainOverview/types'
import { formatNum, getPercentChange } from '~/utils'

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
