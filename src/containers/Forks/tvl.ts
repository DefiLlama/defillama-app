const MAX_FORK_TO_ORIGINAL_TVL_PERCENT = 1e18
const DC_AND_LS_OVERLAP_API_KEY = 'dcAndLsOverlap'

export function getForkToOriginalTvlPercent(forkTvl: number, parentTvl: number | null | undefined): number | null {
	if (!Number.isFinite(forkTvl) || forkTvl < 0 || parentTvl == null || !Number.isFinite(parentTvl) || parentTvl <= 0) {
		return null
	}

	const ratioPercent = (forkTvl / parentTvl) * 100
	if (!Number.isFinite(ratioPercent) || ratioPercent > MAX_FORK_TO_ORIGINAL_TVL_PERCENT) {
		return null
	}

	return Math.round(ratioPercent * 100) / 100
}

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

export function calculateTvlWithExtraToggles({
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
