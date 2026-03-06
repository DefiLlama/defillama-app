import type { Row } from '@tanstack/react-table'

export const percentageSortingFn = <T extends Record<string, any>>(
	rowA: Row<T>,
	rowB: Row<T>,
	columnId: string
): number => {
	const a = rowA.getValue(columnId) as number | null | undefined
	const b = rowB.getValue(columnId) as number | null | undefined

	if (a == null && b == null) {
		return 0
	}

	if (a == null) {
		return 1
	}

	if (b == null) {
		return -1
	}

	return a - b
}
