import { Row } from '@tanstack/react-table'

export const percentageSortingFn = <T extends Record<string, any>>(
	rowA: Row<T>,
	rowB: Row<T>,
	columnId: string
): number => {
	const a = rowA.getValue(columnId) as number | null | undefined
	const b = rowB.getValue(columnId) as number | null | undefined

	if ((a === null || a === undefined) && (b === null || b === undefined)) {
		return 0
	}

	if (a === null || a === undefined) {
		return 1
	}

	if (b === null || b === undefined) {
		return -1
	}

	return a - b
}
