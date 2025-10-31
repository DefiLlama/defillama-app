import type { TableFilters } from '../../../types'
import type { NormalizedRow } from '../types'

const normalize = (value: string | null | undefined) => value?.toLowerCase().trim()

export function filterRowsByConfig(rows: NormalizedRow[], filters?: TableFilters): NormalizedRow[] {
	if (!filters) {
		return rows
	}

	let filtered = rows

	if (filters.protocols?.length) {
		const protocolSet = new Set(filters.protocols.map((p) => normalize(p)))
		filtered = filtered.filter((row) => {
			const protocolId = normalize(row.protocolId)
			const rowName = normalize(row.name)
			return (protocolId && protocolSet.has(protocolId)) || (rowName && protocolSet.has(rowName))
		})
	}

	if (filters.categories?.length) {
		const categorySet = new Set(filters.categories.map((c) => normalize(c)))
		filtered = filtered.filter((row) => {
			const category = normalize(row.category)
			return category ? categorySet.has(category) : false
		})
	}

	if (filters.excludedCategories?.length) {
		const excludedSet = new Set(filters.excludedCategories.map((c) => normalize(c)))
		filtered = filtered.filter((row) => {
			const category = normalize(row.category)
			return category ? !excludedSet.has(category) : true
		})
	}

	if (filters.chains?.length) {
		const chainSet = new Set(filters.chains.map((c) => normalize(c)))
		filtered = filtered.filter((row) => {
			const chain = normalize(row.chain)
			return chain ? chainSet.has(chain) : true
		})
	}

	return filtered
}

export function filterRowsBySearch(rows: NormalizedRow[], searchTerm: string): NormalizedRow[] {
	const term = searchTerm.trim().toLowerCase()
	if (!term) {
		return rows
	}

	return rows.filter((row) => {
		const name = row.name?.toLowerCase() ?? ''
		const chain = row.chain?.toLowerCase() ?? ''
		const category = row.category?.toLowerCase() ?? ''
		return name.includes(term) || chain.includes(term) || category.includes(term)
	})
}

