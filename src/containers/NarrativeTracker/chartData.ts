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
