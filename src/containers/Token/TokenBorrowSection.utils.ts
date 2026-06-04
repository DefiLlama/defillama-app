import type { IYieldsOptimizerTableRow } from '~/containers/Yields/Tables/types'

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
	const minAvailableValue = minAvailable === '' ? null : Number(minAvailable)
	const maxAvailableValue = maxAvailable === '' ? null : Number(maxAvailable)
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
