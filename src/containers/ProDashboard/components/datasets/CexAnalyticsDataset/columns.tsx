import type { ColumnDef } from '@tanstack/react-table'
import type { CexAnalyticsSnapshotRow } from '~/containers/ProDashboard/types'
import { formattedNum } from '~/utils'

const formatRatio = (value: number | null, suffix = 'x') =>
	value == null ? (
		<span className="text-(--text-tertiary)">-</span>
	) : (
		<span>
			{value.toFixed(2)}
			{suffix}
		</span>
	)

const formatPercent = (value: number | null) =>
	value == null ? <span className="text-(--text-tertiary)">-</span> : <span>{value.toFixed(2)}%</span>

const formatCurrency = (value: number | null) =>
	value == null ? <span className="text-(--text-tertiary)">-</span> : <>{formattedNum(value, true)}</>

export const cexAnalyticsColumns: ColumnDef<CexAnalyticsSnapshotRow>[] = [
	{
		header: 'CEX',
		id: 'venue',
		accessorFn: (row) => row.venue,
		enableSorting: false,
		size: 280,
		cell: ({ getValue, row }) => (
			<span className="relative flex items-center gap-2 pl-6">
				<span className="shrink-0">{row.index + 1}</span>
				<span className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap">
					{getValue() as string}
				</span>
			</span>
		)
	},
	{
		header: 'Spot 24h',
		accessorKey: 'spotVolume24h',
		size: 140,
		meta: { align: 'end' },
		cell: ({ getValue }) => formatCurrency(getValue() as number)
	},
	{
		header: 'Derivatives 24h',
		accessorKey: 'derivativesVolume24h',
		size: 150,
		meta: { align: 'end' },
		cell: ({ getValue }) => formatCurrency(getValue() as number)
	},
	{
		header: 'Spot Share',
		accessorKey: 'spotShare',
		size: 110,
		meta: { align: 'end' },
		cell: ({ getValue }) => formatPercent(getValue() as number)
	},
	{
		header: 'Derivatives Share',
		accessorKey: 'derivativesShare',
		size: 140,
		meta: { align: 'end' },
		cell: ({ getValue }) => formatPercent(getValue() as number)
	},
	{
		header: 'Derivatives / Spot',
		accessorKey: 'derivativesToSpotRatio',
		size: 145,
		meta: { align: 'end' },
		cell: ({ getValue }) => formatRatio(getValue() as number | null)
	},
	{
		header: 'Open Interest',
		accessorKey: 'openInterest',
		size: 135,
		meta: { align: 'end' },
		cell: ({ getValue }) => formatCurrency(getValue() as number | null)
	},
	{
		header: 'Avg Leverage',
		accessorKey: 'avgLeverage',
		size: 120,
		meta: { align: 'end' },
		cell: ({ getValue }) => formatRatio(getValue() as number | null)
	},
	{
		header: 'Clean TVL',
		accessorKey: 'cleanTvl',
		size: 120,
		meta: { align: 'end' },
		cell: ({ getValue }) => formatCurrency(getValue() as number | null)
	},
	{
		header: 'Volume / TVL',
		accessorKey: 'volumeToTvl',
		size: 120,
		meta: { align: 'end' },
		cell: ({ getValue }) => formatRatio(getValue() as number | null)
	}
]
