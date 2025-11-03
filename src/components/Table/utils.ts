interface IColumnOrder {
	[key: number]: Array<string>
}

export const formatColumnOrder = (columnOrders: IColumnOrder) => {
	return Object.entries(columnOrders)
		.map(([size, order]) => [Number(size), order])
		.sort(([a], [b]) => b - a) as Array<[number, Array<string>]>
}

export function splitArrayByFalsyValues(data, column) {
	return data.reduce(
		(acc, curr) => {
			if (!curr[column] && curr[column] !== 0) {
				acc[1].push(curr)
			} else acc[0].push(curr)
			return acc
		},
		[[], []]
	)
}

export function getColumnSizesKeys(columnSizes) {
	return Object.keys(columnSizes)
		.map((x) => Number(x))
		.sort((a, b) => Number(b) - Number(a))
}

export function alphanumericFalsyLast(rowA, rowB, columnId, sorting) {
	const desc = sorting.length ? sorting[0].desc : true

	let a = (rowA.getValue(columnId) ?? null) as any
	let b = (rowB.getValue(columnId) ?? null) as any

	/**
	 * These first 3 conditions keep our null values at the bottom.
	 */
	if (a === null && b !== null) {
		return desc ? -1 : 1
	}

	if (a !== null && b === null) {
		return desc ? 1 : -1
	}

	if (a === null && b === null) {
		return 0
	}

	// at this point, you have non-null values and you should do whatever is required to sort those values correctly
	return a - b
}
