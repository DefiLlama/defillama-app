import { getPercentChange } from '~/utils'
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
