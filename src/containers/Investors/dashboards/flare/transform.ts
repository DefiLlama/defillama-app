export interface UpstreamSeries {
	name: string
	type?: 'bar' | 'line'
	data: number[]
}

export interface UpstreamChart {
	title?: string
	subtitle?: string
	dates: string[]
	series: UpstreamSeries[]
}

export function parseDateToUnix(dateStr: string): number {
	if (/^\d+$/.test(dateStr)) {
		const n = parseInt(dateStr, 10)
		return n > 1e12 ? Math.floor(n / 1000) : n
	}
	return Math.floor(new Date(dateStr.length === 10 ? dateStr + 'T00:00:00Z' : dateStr).getTime() / 1000)
}

export function chartToData(chart: UpstreamChart | undefined): Array<Record<string, number>> {
	if (!chart || !chart.dates || !chart.series) return []
	return chart.dates.map((dt, i) => {
		const point: Record<string, number> = { date: parseDateToUnix(dt) }
		for (const s of chart.series) {
			const v = s.data?.[i]
			point[s.name] = typeof v === 'number' && Number.isFinite(v) ? v : 0
		}
		return point
	})
}

