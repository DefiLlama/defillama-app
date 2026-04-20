const DAY_MS = 24 * 60 * 60 * 1000
const DEFAULT_LOOKUP_TOLERANCE_MS = 2 * 60 * 60 * 1000

function toUnixMsTimestamp(timestamp: number): number {
	return timestamp > 1e12 ? timestamp : timestamp * 1e3
}

function getUtcStartOfDay(timestamp: number): number {
	const date = new Date(timestamp)
	return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
}

export function getPrevTvlFromChart(
	chart: [number, number][] | null | undefined,
	daysBefore: number,
	currentTimeMs: number = Date.now()
): number | null {
	if (!chart?.length) return null

	if (daysBefore === 0) {
		return chart[chart.length - 1]?.[1] ?? null
	}

	const latestTimestamp = toUnixMsTimestamp(Number(chart[chart.length - 1]?.[0]))
	const todayStart = getUtcStartOfDay(currentTimeMs)
	if (!Number.isFinite(latestTimestamp) || latestTimestamp < todayStart) return null

	const targetTimestamp = latestTimestamp - daysBefore * DAY_MS
	let closestValue: number | null = null
	let closestTimestamp = -Infinity
	let smallestDiff = Infinity

	for (let index = 0; index < chart.length; index++) {
		const [timestamp, value] = chart[index]
		const normalizedTimestamp = toUnixMsTimestamp(Number(timestamp))
		const diff = Math.abs(normalizedTimestamp - targetTimestamp)
		if (diff > DEFAULT_LOOKUP_TOLERANCE_MS) continue
		if (diff < smallestDiff || (diff === smallestDiff && normalizedTimestamp > closestTimestamp)) {
			smallestDiff = diff
			closestTimestamp = normalizedTimestamp
			closestValue = value ?? null
		}
	}

	return closestValue
}
