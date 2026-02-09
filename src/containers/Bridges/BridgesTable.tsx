import {
	ColumnDef,
	ColumnFiltersState,
	ColumnOrderState,
	ColumnSizingState,
	getCoreRowModel,
	getFilteredRowModel,
	getSortedRowModel,
	SortingState,
	useReactTable
} from '@tanstack/react-table'
import * as React from 'react'
import { IconsRow } from '~/components/IconsRow'
import { BasicLink } from '~/components/Link'
import { VirtualTable } from '~/components/Table/Table'
import { useSortColumnSizesAndOrders } from '~/components/Table/utils'
import type { ColumnOrdersByBreakpoint, ColumnSizesByBreakpoint } from '~/components/Table/utils'
import { TokenLogo } from '~/components/TokenLogo'
import { chainIconUrl, formattedNum, renderPercentChange, slug, tokenIconUrl } from '~/utils'

export type BridgesTableRow = {
	displayName: string
	icon?: string
	chains: Array<string>
	change_1d?: number
	lastDailyVolume?: number
	weeklyVolume?: number
	monthlyVolume?: number
	txsPrevDay?: number
}

const bridgesColumn: ColumnDef<BridgesTableRow>[] = [
	{
		header: 'Name',
		accessorKey: 'displayName',
		enableSorting: false,
		cell: ({ getValue, row }) => {
			const value = getValue() as string
			const linkValue = slug(value)
			const rowValues = row.original
			const icon = rowValues.icon
			let iconLink
			if (icon) {
				const [iconType, iconName] = icon.split(':')
				iconLink = iconType === 'chain' ? chainIconUrl(iconName) : tokenIconUrl(iconName)
			}

			return (
				<span className="flex items-center gap-2">
					<span className="vf-row-index shrink-0" aria-hidden="true" />
					{icon && <TokenLogo logo={iconLink} data-lgonly />}
					<BasicLink
						href={`/bridge/${linkValue}`}
						className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text)"
					>
						{value}
					</BasicLink>
				</span>
			)
		},
		size: 240
	},
	{
		header: 'Chains',
		accessorKey: 'chains',
		enableSorting: false,
		cell: ({ getValue }) => <IconsRow links={getValue() as Array<string>} url="/bridges" iconType="chain" />,
		size: 200,
		meta: {
			align: 'end',
			headerHelperText: 'Chains are ordered by bridge volume on each chain'
		}
	},
	{
		header: '1d Change',
		accessorKey: 'change_1d',
		cell: (info) => <>{renderPercentChange(info.getValue())}</>,
		size: 100,
		meta: {
			align: 'end'
		}
	},
	{
		header: '24h Volume',
		accessorKey: 'lastDailyVolume',
		cell: (info) => formattedNum(info.getValue(), true),
		size: 120,
		meta: {
			align: 'end'
		}
	},
	{
		header: '7d Volume',
		accessorKey: 'weeklyVolume',
		cell: (info) => formattedNum(info.getValue(), true),
		size: 120,
		meta: {
			align: 'end'
		}
	},
	{
		header: '1m Volume',
		accessorKey: 'monthlyVolume',
		cell: (info) => formattedNum(info.getValue(), true),
		size: 120,
		meta: {
			align: 'end'
		}
	},
	{
		header: '24h # of Txs',
		accessorKey: 'txsPrevDay',
		size: 120,
		meta: {
			align: 'end'
		}
	}
]

// key: min width of window/screen
// values: table columns order
const bridgesColumnOrders: ColumnOrdersByBreakpoint = {
	0: ['displayName', 'lastDailyVolume', 'change_1d', 'weeklyVolume', 'monthlyVolume', 'chains', 'txsPrevDay'],
	1024: ['displayName', 'chains', 'change_1d', 'lastDailyVolume', 'weeklyVolume', 'monthlyVolume', 'txsPrevDay']
}

const bridgesColumnSizes: ColumnSizesByBreakpoint = {
	0: {
		displayName: 140,
		chains: 180,
		change_1d: 100,
		lastDailyVolume: 120,
		weeklyVolume: 120,
		monthlyVolume: 120,
		txsPrevDay: 120
	},
	480: {
		displayName: 180,
		chains: 180,
		change_1d: 100,
		lastDailyVolume: 120,
		weeklyVolume: 120,
		monthlyVolume: 120,
		txsPrevDay: 120
	},
	1024: {
		displayName: 240,
		chains: 200,
		change_1d: 100,
		lastDailyVolume: 120,
		weeklyVolume: 120,
		monthlyVolume: 120,
		txsPrevDay: 120
	}
}

export function BridgesTable({ data, searchValue = '' }: { data: BridgesTableRow[]; searchValue?: string }) {
	const [sorting, setSorting] = React.useState<SortingState>([{ id: 'lastDailyVolume', desc: true }])
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
	const [columnOrder, setColumnOrder] = React.useState<ColumnOrderState>([])
	const [columnSizing, setColumnSizing] = React.useState<ColumnSizingState>({})

	const instance = useReactTable({
		data,
		columns: bridgesColumn,
		state: {
			sorting,
			columnFilters,
			columnOrder,
			columnSizing
		},
		defaultColumn: {
			sortUndefined: 'last'
		},
		onSortingChange: setSorting,
		onColumnFiltersChange: setColumnFilters,
		onColumnOrderChange: setColumnOrder,
		onColumnSizingChange: setColumnSizing,
		getCoreRowModel: getCoreRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getSortedRowModel: getSortedRowModel()
	})

	React.useEffect(() => {
		React.startTransition(() => {
			instance.getColumn('displayName')?.setFilterValue(searchValue)
		})
	}, [searchValue, instance])

	useSortColumnSizesAndOrders({
		instance,
		columnSizes: bridgesColumnSizes,
		columnOrders: bridgesColumnOrders
	})

	return <VirtualTable instance={instance} />
}
