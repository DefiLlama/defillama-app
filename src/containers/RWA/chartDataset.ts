export const RWA_OPEN_INTEREST_SERIES_LABEL = 'RWA Perps OI'

export type RWAChartSeriesValue = number | null | undefined
export type RWAChartRow = { timestamp: number } & Record<string, RWAChartSeriesValue>
export type RWAChartDataset = { source: RWAChartRow[]; dimensions: string[] }
export type RwaNamedValue = { name: string; value: number }

export const RWA_MAX_HORIZONTAL_BARS = 9

export function emptyChartDataset(): RWAChartDataset {
	return { source: [], dimensions: ['timestamp'] }
}

export function toFiniteRwaChartValue(value: unknown): number {
	const numeric = typeof value === 'number' ? value : Number(value)
	return Number.isFinite(numeric) ? numeric : 0
}

export function buildRwaChartDatasetTotal({
	dataset,
	totalLabel = 'Total',
	onlyTotal = false,
	isSeriesDimension
}: {
	dataset: RWAChartDataset
	totalLabel?: string
	onlyTotal?: boolean
	isSeriesDimension?: (dimension: string) => boolean
}): RWAChartDataset {
	if (dataset.source.length === 0) return emptyChartDataset()

	const seriesDimensions: string[] = []
	for (const dimension of dataset.dimensions) {
		const includeSeries = isSeriesDimension
			? isSeriesDimension(dimension)
			: dimension !== 'timestamp' && dimension !== totalLabel
		if (includeSeries) {
			seriesDimensions.push(dimension)
		}
	}
	if (seriesDimensions.length === 0) return onlyTotal ? emptyChartDataset() : dataset

	const source: RWAChartDataset['source'] = []
	for (const row of dataset.source) {
		const nextRow: RWAChartRow = { timestamp: row.timestamp }
		if (!onlyTotal) {
			for (const key in row) {
				nextRow[key] = row[key]
			}
		}

		let total = 0
		for (const dimension of seriesDimensions) {
			total += toFiniteRwaChartValue(row[dimension])
		}
		nextRow[totalLabel] = total
		source.push(nextRow)
	}

	if (onlyTotal) {
		return {
			source,
			dimensions: ['timestamp', totalLabel]
		}
	}

	return {
		source,
		dimensions: ['timestamp', totalLabel, ...seriesDimensions]
	}
}

export function appendRwaChartDatasetTotal(dataset: RWAChartDataset): RWAChartDataset {
	return buildRwaChartDatasetTotal({ dataset })
}

export function limitRwaHorizontalBarData(
	items: readonly RwaNamedValue[],
	{ maxBars = RWA_MAX_HORIZONTAL_BARS, sort = false }: { maxBars?: number; sort?: boolean } = {}
): RwaNamedValue[] {
	let othersValue = 0
	const withoutOthers: RwaNamedValue[] = []
	for (const item of items) {
		const value = toFiniteRwaChartValue(item.value)
		if (value <= 0) continue
		if (item.name === 'Others') {
			othersValue += value
			continue
		}
		withoutOthers.push({ name: item.name, value })
	}

	if (sort) {
		withoutOthers.sort((a, b) => b.value - a.value || a.name.localeCompare(b.name))
	}

	if (withoutOthers.length <= maxBars - (othersValue > 0 ? 1 : 0)) {
		return othersValue > 0 ? [...withoutOthers, { name: 'Others', value: othersValue }] : withoutOthers
	}

	const limited = withoutOthers.slice(0, maxBars - 1)
	let overflowValue = othersValue
	for (let index = maxBars - 1; index < withoutOthers.length; index++) {
		overflowValue += withoutOthers[index].value
	}
	return overflowValue > 0 ? [...limited, { name: 'Others', value: overflowValue }] : limited
}

export function isRwaTotalSeriesLabel(label: string): boolean {
	return label.startsWith('Total ')
}

export function sortRwaChartSeriesLabels(labels: string[]): string[] {
	const totalSeries = labels.filter(isRwaTotalSeriesLabel)
	const hasOpenInterestSeries = labels.includes(RWA_OPEN_INTEREST_SERIES_LABEL)
	const otherSeries = labels.filter(
		(label) => !isRwaTotalSeriesLabel(label) && label !== RWA_OPEN_INTEREST_SERIES_LABEL
	)

	return [...totalSeries, ...(hasOpenInterestSeries ? [RWA_OPEN_INTEREST_SERIES_LABEL] : []), ...otherSeries]
}

export function getRwaReservedSeriesColorSlot(label: string): number | null {
	if (isRwaTotalSeriesLabel(label)) return 0
	if (label === RWA_OPEN_INTEREST_SERIES_LABEL) return 1
	return null
}

export function getRwaChartSeriesColorSlots(labels: string[]): Record<string, number> {
	const colorSlots: Record<string, number> = {}
	let nextNonReservedColorSlot = 2

	for (const label of sortRwaChartSeriesLabels(labels)) {
		colorSlots[label] = getRwaReservedSeriesColorSlot(label) ?? nextNonReservedColorSlot++
	}

	return colorSlots
}

export function mergeRwaChartDatasets(primary: RWAChartDataset, overlay: RWAChartDataset): RWAChartDataset {
	if (overlay.dimensions.length <= 1 || overlay.source.length === 0) return primary
	if (primary.dimensions.length <= 1 || primary.source.length === 0) return overlay

	const mergedRows = new Map<number, RWAChartRow>()

	for (const row of primary.source) {
		mergedRows.set(row.timestamp, { ...row })
	}

	for (const row of overlay.source) {
		const existingRow = mergedRows.get(row.timestamp)
		if (existingRow) {
			Object.assign(existingRow, row)
			continue
		}

		mergedRows.set(row.timestamp, { ...row })
	}

	return {
		source: Array.from(mergedRows.values()).toSorted((a, b) => a.timestamp - b.timestamp),
		dimensions: [
			'timestamp',
			...primary.dimensions.filter((dimension) => dimension !== 'timestamp'),
			...overlay.dimensions.filter((dimension) => dimension !== 'timestamp' && !primary.dimensions.includes(dimension))
		]
	}
}
