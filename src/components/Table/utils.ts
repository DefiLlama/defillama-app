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
