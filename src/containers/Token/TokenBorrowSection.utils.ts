import type { IYieldsOptimizerTableRow } from '~/containers/Yields/Tables/types'

function parseAvailableBound(value: string) {
	if (value === '') return null
	const numericValue = Number(value)
	return Number.isFinite(numericValue) ? numericValue : null
}

export function filterBorrowRows({
	rows,
	selectedChains,
	minAvailable,
	maxAvailable
}: {
	rows: IYieldsOptimizerTableRow[]
	selectedChains: string[]
	minAvailable: string
	maxAvailable: string
}) {
	const minAvailableValue = parseAvailableBound(minAvailable)
	const maxAvailableValue = parseAvailableBound(maxAvailable)
	const chainSet = new Set(selectedChains)

	return rows.filter((row) => {
		const rowChain = row.chains[0]
		const available = row.borrow?.totalAvailableUsd ?? null

		if (selectedChains.length === 0) return false
		if (rowChain && !chainSet.has(rowChain)) return false
		if (minAvailableValue != null && (available == null || available < minAvailableValue)) return false
		if (maxAvailableValue != null && (available == null || available > maxAvailableValue)) return false

		return true
	})
}
