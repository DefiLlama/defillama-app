import dayjs from 'dayjs'
import type { IMultiSeriesChart2Props, MultiSeriesChart2Dataset } from '~/components/ECharts/types'
import { COLOR_PALETTE } from '../constants'

type UnlockEvent = { protocol: string; value: number }

export type UnlocksLikeData = Record<
	string,
	{
		events?: UnlockEvent[]
	}
>

export type UnlocksMultiSeriesChartResult = {
	dataset: MultiSeriesChart2Dataset
	charts: NonNullable<IMultiSeriesChart2Props['charts']>
}

export function buildUnlocksMultiSeriesChartForDateRange({
	dates,
	unlocksData
}: {
	dates: string[]
	unlocksData: UnlocksLikeData
}): UnlocksMultiSeriesChartResult {
	const protocolTotals: Record<string, number> = Object.create(null)

	for (const dateStr of dates) {
		const dayData = unlocksData?.[dateStr]
		const events = dayData?.events
		if (!events || events.length === 0) continue

		for (const event of events) {
			const name = event?.protocol
			const value = Number(event?.value)
			if (!name || !Number.isFinite(value) || value <= 0) continue
			protocolTotals[name] = (protocolTotals[name] || 0) + value
		}
	}

	const sortedProtocols = Object.keys(protocolTotals).sort((a, b) => protocolTotals[b] - protocolTotals[a])

	// Keep rendering behavior consistent with the old BarChart:
	// if there are no protocol series, still render a 0-valued series.
	const hasProtocolSeries = sortedProtocols.length > 0
	const seriesNames: string[] = hasProtocolSeries ? sortedProtocols : ['Unlocks']

	const source = dates.map((dateStr) => {
		const parsedDate = dayjs(dateStr)
		const row: Record<string, number> = { timestamp: parsedDate.unix() * 1e3 }

		for (let j = 0; j < seriesNames.length; j++) row[seriesNames[j]] = 0

		const events = unlocksData?.[dateStr]?.events
		if (hasProtocolSeries && events && events.length > 0) {
			for (const event of events) {
				const name = event?.protocol
				const value = Number(event?.value)
				if (!name || !Number.isFinite(value) || value <= 0) continue
				if (row[name] != null) row[name] += value
			}
		}

		return row
	})

	const dimensions = ['timestamp', ...seriesNames]

	const charts = seriesNames.map((name, i) => ({
		type: 'bar' as const,
		name,
		encode: { x: 'timestamp', y: name },
		stack: 'unlocks',
		color: COLOR_PALETTE[i % COLOR_PALETTE.length],
		large: true
	}))

	return {
		dataset: { source, dimensions } satisfies MultiSeriesChart2Dataset,
		charts
	}
}
