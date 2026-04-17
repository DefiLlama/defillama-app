export type AxisExtent = {
	min?: number
	max?: number
}

export type AxisSeriesType = 'line' | 'bar'

export function getZeroBaselineYAxisMin(extent: AxisExtent) {
	return typeof extent.min === 'number' && extent.min < 0 ? extent.min : 0
}

export function getAutoFitYAxisMin(extent: AxisExtent) {
	if (!Number.isFinite(extent.min) || !Number.isFinite(extent.max)) return extent.min
	const range = extent.max - extent.min
	if (range <= 0) return extent.min
	return extent.min - range * 0.05
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

export function getDefaultYAxisMinForSeriesTypes(seriesTypes?: Iterable<AxisSeriesType>) {
	if (!seriesTypes) return getZeroBaselineYAxisMin

	let hasLine = false
	for (const type of seriesTypes) {
		if (type === 'bar') return getZeroBaselineYAxisMin
		if (type === 'line') hasLine = true
	}

	return hasLine ? getAutoFitYAxisMin : getZeroBaselineYAxisMin
}
