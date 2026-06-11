import type { TimeSeriesEntry } from './api.types'
import type { IPctChangeRow } from './types'

export type NarrativeTreemapTreeData = Array<{
	value: [number, number | null, number | null]
	name: string
	path: string
	children: Array<{
		value: [number, number, number]
		name: string
		path: string
	}>
}>

export function asFiniteNumber(value: unknown): number | null {
	return typeof value === 'number' && Number.isFinite(value) ? value : null
}

export function calculateDenominatedTimeSeries(
	data: TimeSeriesEntry[] | undefined,
	denominatedCoin: string
): TimeSeriesEntry[] {
	const sortedData = (data ?? []).toSorted((a, b) => a.date - b.date)
	if (sortedData.length === 0) return sortedData

	const denominatedCoinDay0 = asFiniteNumber(sortedData[0]?.[denominatedCoin])
	if (denominatedCoinDay0 == null) return sortedData

	const denominatedReturns: TimeSeriesEntry[] = []

	for (const dayData of sortedData) {
		const newDayData: TimeSeriesEntry = { date: dayData.date }
		const denominatedCoinValue = asFiniteNumber(dayData[denominatedCoin])
		const denominatedCoinPerformance = denominatedCoinValue == null ? null : 1 + denominatedCoinValue / 100
		if (!Number.isFinite(denominatedCoinPerformance) || denominatedCoinPerformance === 0) {
			denominatedReturns.push(newDayData)
			continue
		}

		for (const category in dayData) {
			if (category === 'date' || category === denominatedCoin) continue

			const categoryValue = asFiniteNumber(dayData[category])
			if (categoryValue == null) continue
			const categoryPerformance = 1 + categoryValue / 100
			const relativePerformance = (categoryPerformance / denominatedCoinPerformance - 1) * 100

			if (Number.isFinite(relativePerformance)) {
				newDayData[category] = relativePerformance
			}
		}

		denominatedReturns.push(newDayData)
	}

	return denominatedReturns
}

function safeTreemapReturn(value: number | null | undefined): number {
	return typeof value === 'number' && Number.isFinite(value) ? parseFloat(value.toFixed(2)) : 0
}

export function buildNarrativeTreemapTreeData(rows: IPctChangeRow[]): NarrativeTreemapTreeData {
	const treeData: NarrativeTreemapTreeData = []
	const categoryGroups = new Map<string, NarrativeTreemapTreeData[number]>()

	for (const row of rows) {
		const categoryName = row.categoryName ?? ''
		let category = categoryGroups.get(categoryName)
		if (!category) {
			category = {
				value: [0, null, null],
				name: categoryName,
				path: categoryName,
				children: []
			}
			categoryGroups.set(categoryName, category)
			treeData.push(category)
		}

		category.value[0] += row.mcap
		const returnValue = safeTreemapReturn(row.returnField)
		category.children.push({
			value: [row.mcap, returnValue, returnValue],
			name: row.name,
			path: `${categoryName}/${row.name}`
		})
	}

	return treeData
}
