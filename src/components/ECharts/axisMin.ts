export type AxisExtent = {
	min?: number
	max?: number
}

export type AxisSeriesType = 'line' | 'bar'

export function getZeroBaselineYAxisMin(extent: AxisExtent) {
	return typeof extent.min === 'number' && extent.min < 0 ? extent.min : 0
}

export function getRenderedSeriesTypesByYAxisIndex(
	series: ReadonlyArray<{
		type: AxisSeriesType
		yAxisIndex?: number | null
	}>
) {
	const seriesTypesByAxisIndex = new Map<number, Set<AxisSeriesType>>()

	for (const { type, yAxisIndex } of series) {
		const axisIndex = yAxisIndex ?? 0
		const axisSeriesTypes = seriesTypesByAxisIndex.get(axisIndex) ?? new Set<AxisSeriesType>()
		axisSeriesTypes.add(type)
		seriesTypesByAxisIndex.set(axisIndex, axisSeriesTypes)
	}

	return seriesTypesByAxisIndex
}
