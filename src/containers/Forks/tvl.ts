const MAX_FORK_TO_ORIGINAL_TVL_PERCENT = 1e18
const DC_AND_LS_OVERLAP_API_KEY = 'dcAndLsOverlap'

function normalizeFlags(extraTvlsEnabled: Record<string, boolean>): Record<string, boolean> {
	return Object.fromEntries(Object.entries(extraTvlsEnabled).map(([key, enabled]) => [key.toLowerCase(), enabled]))
}

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
	const normalizedFlags = normalizeFlags(extraTvlsEnabled)
	const apiKeys: string[] = []
	for (const [settingKey, enabled] of Object.entries(extraTvlsEnabled)) {
		if (!enabled || settingKey.toLowerCase() === 'tvl') continue
		apiKeys.push(settingKey)
	}

	if (normalizedFlags['doublecounted'] && normalizedFlags['liquidstaking']) {
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
	const normalizedFlags = normalizeFlags(extraTvlsEnabled)
	let sum = values.tvl ?? 0

	for (const [metricName, metricValue] of Object.entries(values)) {
		const normalizedMetricName = metricName.toLowerCase()
		if (normalizedMetricName === 'tvl') continue

		if (normalizedMetricName === 'dcandlsoverlap') {
			if (normalizedFlags['doublecounted'] && normalizedFlags['liquidstaking']) {
				sum -= metricValue ?? 0
			}
			continue
		}

		if (normalizedFlags[normalizedMetricName]) {
			sum += metricValue ?? 0
		}
	}

	return sum
}
