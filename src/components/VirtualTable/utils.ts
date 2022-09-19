interface IColumnOrder {
	[key: number]: Array<string>
}

export const formatColumnOrder = (columnOrders: IColumnOrder) => {
	return Object.entries(columnOrders)
		.map(([size, order]) => [Number(size), order])
		.sort(([a], [b]) => b - a) as Array<[number, Array<string>]>
}
