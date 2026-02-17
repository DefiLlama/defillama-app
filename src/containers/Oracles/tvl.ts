export function calculateTvsWithExtraToggles({
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
			if (extraTvlsEnabled.doublecounted && extraTvlsEnabled.liquidstaking) {
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

const DC_AND_LS_OVERLAP_API_KEY = 'dcAndLsOverlap'

export function getEnabledExtraApiKeys(extraTvlsEnabled: Record<string, boolean>): string[] {
	const apiKeys: string[] = []
	for (const [settingKey, enabled] of Object.entries(extraTvlsEnabled)) {
		if (!enabled || settingKey.toLowerCase() === 'tvl') continue
		apiKeys.push(settingKey)
	}

	if (extraTvlsEnabled.doublecounted && extraTvlsEnabled.liquidstaking) {
		apiKeys.push(DC_AND_LS_OVERLAP_API_KEY)
	}

	return apiKeys.toSorted((a, b) => a.localeCompare(b))
}
