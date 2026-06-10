import type { TvlSettingsKey } from '~/contexts/LocalStorage'
import { applyTvlOverlapBaseAdjustment } from '~/utils/tvl'
import { shouldSubtractTvlOverlapSeries } from '~/utils/tvlOverlap'

type ChainTvlValue = number | null | undefined
type ChainTvlExtraValues = Partial<Record<TvlSettingsKey | 'dcAndLsOverlap', ChainTvlValue>>
type ChainTvlExtraEntry = {
	tvl: number
	tvlPrevDay: number
	tvlPrevWeek: number
	tvlPrevMonth: number
}
type ChainExtraTvlRecord = Partial<Record<TvlSettingsKey | 'dcAndLsOverlap' | 'excludeparent', ChainTvlExtraEntry>>

const EXTRA_TVL_STALE_TOLERANCE_MS = 2 * 24 * 60 * 60 * 1000

const getLatestChartTimestamp = (chart: Record<number, number> | undefined): number | null => {
	if (!chart) return null

	let latestTimestamp: number | null = null
	for (const timestamp in chart) {
		const parsedTimestamp = Number(timestamp)
		if (!Number.isFinite(parsedTimestamp)) continue
		latestTimestamp = latestTimestamp == null ? parsedTimestamp : Math.max(latestTimestamp, parsedTimestamp)
	}

	return latestTimestamp
}

export function normalizeChainsBaseTvlValue(baseValue: ChainTvlValue, extraValues: ChainTvlExtraValues = {}): number {
	return applyTvlOverlapBaseAdjustment(baseValue, extraValues)
}

export function applyChainsTvlSettings(
	baseValue: ChainTvlValue,
	extraValues: ChainTvlExtraValues = {},
	enabledSettings: readonly TvlSettingsKey[]
): number | null {
	let hasAnyValue = baseValue != null
	let value = baseValue ?? 0
	for (const key of enabledSettings) {
		const extraValue = extraValues[key]
		if (extraValue != null) {
			value += extraValue
			hasAnyValue = true
		}
	}

	const overlapValue = extraValues.dcAndLsOverlap
	if (shouldSubtractTvlOverlapSeries(enabledSettings) && overlapValue != null) {
		value -= overlapValue
		hasAnyValue = true
	}

	return hasAnyValue ? value : null
}

export function removeStaleChainExtraTvlEntries({
	chainName,
	extraTvl,
	tvlChartsByChain
}: {
	chainName: string
	extraTvl: ChainExtraTvlRecord | undefined
	tvlChartsByChain: Record<string, Record<string, Record<number, number>>>
}): ChainExtraTvlRecord {
	if (!extraTvl) return {}

	const latestBaseTimestamp = getLatestChartTimestamp(tvlChartsByChain.tvl?.[chainName])
	if (latestBaseTimestamp == null) return extraTvl

	const sanitizedExtraTvl: ChainExtraTvlRecord = {}
	for (const key in extraTvl) {
		const typedKey = key as keyof ChainExtraTvlRecord
		if (!(typedKey in tvlChartsByChain)) {
			sanitizedExtraTvl[typedKey] = extraTvl[typedKey]
			continue
		}

		const latestExtraTimestamp = getLatestChartTimestamp(tvlChartsByChain[typedKey]?.[chainName])
		if (latestExtraTimestamp == null) continue
		if (latestBaseTimestamp - latestExtraTimestamp > EXTRA_TVL_STALE_TOLERANCE_MS) continue
		sanitizedExtraTvl[typedKey] = extraTvl[typedKey]
	}

	if (!sanitizedExtraTvl.doublecounted || !sanitizedExtraTvl.liquidstaking) {
		delete sanitizedExtraTvl.dcAndLsOverlap
	}

	return sanitizedExtraTvl
}
