import { TVL_SETTINGS } from '~/contexts/LocalStorage'

export const DC_AND_LS_OVERLAP_API_KEY = 'dcAndLsOverlap'

function hasEnabledTvlOverlap(extraTvlsEnabled: Record<string, boolean>): boolean {
	return !!extraTvlsEnabled[TVL_SETTINGS.DOUBLE_COUNT] && !!extraTvlsEnabled[TVL_SETTINGS.LIQUID_STAKING]
}

export function getEnabledExtraTvlApiKeys(extraTvlsEnabled: Record<string, boolean>): string[] {
	const apiKeys: string[] = []
	for (const [settingKey, enabled] of Object.entries(extraTvlsEnabled)) {
		if (!enabled || settingKey.toLowerCase() === 'tvl') continue
		apiKeys.push(settingKey)
	}

	if (hasEnabledTvlOverlap(extraTvlsEnabled)) {
		apiKeys.push(DC_AND_LS_OVERLAP_API_KEY)
	}

	return apiKeys.toSorted((a, b) => a.localeCompare(b))
}

export function shouldSubtractTvlOverlapSeries(enabledExtraApiKeys: string[]): boolean {
	return (
		enabledExtraApiKeys.includes(TVL_SETTINGS.DOUBLE_COUNT) && enabledExtraApiKeys.includes(TVL_SETTINGS.LIQUID_STAKING)
	)
}

export function getExtraTvlSeriesSign({
	apiKey,
	shouldSubtractOverlapSeries
}: {
	apiKey: string
	shouldSubtractOverlapSeries: boolean
}): 1 | -1 {
	return apiKey.toLowerCase() === 'dcandlsoverlap' && shouldSubtractOverlapSeries ? -1 : 1
}

export function calculateTotalWithExtraToggles({
	values,
	extraTvlsEnabled
}: {
	values: Record<string, number>
	extraTvlsEnabled: Record<string, boolean>
}): number {
	let sum = values.tvl ?? 0

	for (const [metricName, metricValue] of Object.entries(values)) {
		const normalizedMetricName = metricName.toLowerCase()
		if (normalizedMetricName === 'tvl') continue

		if (normalizedMetricName === 'dcandlsoverlap') {
			if (hasEnabledTvlOverlap(extraTvlsEnabled)) {
				sum -= metricValue ?? 0
			}
			continue
		}

		if (extraTvlsEnabled[normalizedMetricName]) {
			sum += metricValue ?? 0
		}
	}

	return sum
}
