export const createRankCell = () => ({
	cell: ({ row, table }) => {
		// Only show ranks for top-level protocols (depth 0), not for child protocols
		if (row.depth > 0) return null
		const index = table.getSortedRowModel().rows.findIndex((x) => x.id === row.id)
		return <span className="font-bold">{index + 1}</span>
	},
	meta: {
		align: 'center' as const
	},
	size: 60,
	enableSorting: false
})

export const RANK_COLUMN_CONFIG = {
	header: 'Rank',
	accessorKey: 'rank',
	id: 'rank',
	...createRankCell()
}