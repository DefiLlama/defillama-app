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

export function normalizeNarrativeTimeSeries(data: TimeSeriesEntry[] | undefined): TimeSeriesEntry[] {
	const rows = data ?? []
	if (rows.length < 2) return rows

	let prevDate = rows[0].date
	for (let i = 1; i < rows.length; i++) {
		const date = rows[i].date
		if (date < prevDate) return rows.toSorted((a, b) => a.date - b.date)
		prevDate = date
	}

	return rows
}

export function calculateDenominatedTimeSeries(
	data: TimeSeriesEntry[] | undefined,
	denominatedCoin: string
): TimeSeriesEntry[] {
	const sortedData = normalizeNarrativeTimeSeries(data)
	if (sortedData.length === 0) return sortedData

	let hasDenominatedCoin = false
	for (const row of sortedData) {
		if (row[denominatedCoin] != null) {
			hasDenominatedCoin = true
			break
		}
	}
	if (!hasDenominatedCoin) return sortedData

	const denominatedReturns: TimeSeriesEntry[] = []

	for (const dayData of sortedData) {
		const newDayData: TimeSeriesEntry = { date: dayData.date }
		const denominatedCoinValue = dayData[denominatedCoin] ?? null
		const denominatedCoinPerformance = denominatedCoinValue == null ? null : 1 + denominatedCoinValue / 100
		if (denominatedCoinPerformance === null || denominatedCoinPerformance === 0) {
			// Relative performance is undefined without a valid denominator for that day.
			denominatedReturns.push(newDayData)
			continue
		}

		for (const category in dayData) {
			if (category === 'date' || category === denominatedCoin) continue

			const categoryValue = dayData[category] ?? null
			if (categoryValue == null) continue
			const categoryPerformance = 1 + categoryValue / 100
			const relativePerformance = (categoryPerformance / denominatedCoinPerformance - 1) * 100

			newDayData[category] = relativePerformance
		}

		denominatedReturns.push(newDayData)
	}

	return denominatedReturns
}

function safeTreemapReturn(value: number | null | undefined): number {
	return value == null ? 0 : Math.round(value * 100) / 100
}

export function buildNarrativeTreemapTreeData(rows: IPctChangeRow[]): NarrativeTreemapTreeData {
	const treeData: NarrativeTreemapTreeData = []
	const categoryGroups = new Map<string, NarrativeTreemapTreeData[number]>()

	for (const row of rows) {
		const categoryName = row.categoryName ?? ''
		const marketCap = row.mcap ?? 0
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

		category.value[0] += marketCap
		const returnValue = safeTreemapReturn(row.returnField)
		category.children.push({
			value: [marketCap, returnValue, returnValue],
			name: row.name,
			path: `${categoryName}/${row.name}`
		})
	}

	return treeData
}
