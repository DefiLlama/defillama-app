export function hasExtraTvlsToggled(extraTvlsEnabled: Record<string, boolean>): boolean {
	for (const [name, isEnabled] of Object.entries(extraTvlsEnabled)) {
		if (!isEnabled) continue
		if (name.toLowerCase() === 'tvl') continue
		return true
	}

	return false
}

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

		if (normalizedMetricName === 'doublecounted' && !extraTvlsEnabled.doublecounted) {
			sum -= metricValue ?? 0
			continue
		}

		if ((normalizedMetricName === 'doublecounted' || normalizedMetricName === 'd') && !extraTvlsEnabled.doublecounted) {
			sum -= metricValue ?? 0
			continue
		}

		if (normalizedMetricName === 'liquidstaking' && !extraTvlsEnabled.liquidstaking) {
			sum -= metricValue ?? 0
			continue
		}

		if (normalizedMetricName === 'dcandlsoverlap') {
			if (!extraTvlsEnabled.doublecounted || !extraTvlsEnabled.liquidstaking) {
				sum += metricValue ?? 0
			}
			continue
		}

		if (
			extraTvlsEnabled[normalizedMetricName] &&
			normalizedMetricName !== 'doublecounted' &&
			normalizedMetricName !== 'liquidstaking' &&
			normalizedMetricName !== 'd'
		) {
			sum += metricValue ?? 0
		}
	}

	return sum
}
