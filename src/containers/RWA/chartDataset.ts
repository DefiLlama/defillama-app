export const RWA_OPEN_INTEREST_SERIES_LABEL = 'RWA Perps OI'

export type RWAChartRow = { timestamp: number } & Record<string, number>
export type RWAChartDataset = { source: RWAChartRow[]; dimensions: string[] }

export function emptyChartDataset(): RWAChartDataset {
	return { source: [], dimensions: ['timestamp'] }
}

export function appendRwaChartDatasetTotal(dataset: RWAChartDataset): RWAChartDataset {
	const seriesDimensions = dataset.dimensions.filter((dimension) => dimension !== 'timestamp' && dimension !== 'Total')
	if (dataset.source.length === 0) return emptyChartDataset()
	if (seriesDimensions.length === 0) return dataset

	return {
		source: dataset.source.map((row) => ({
			...row,
			Total: seriesDimensions.reduce((sum, dimension) => {
				const value = row[dimension]
				const numericValue = typeof value === 'number' ? value : Number(value)
				return Number.isFinite(numericValue) ? sum + numericValue : sum
			}, 0)
		})),
		dimensions: ['timestamp', 'Total', ...seriesDimensions]
	}
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
