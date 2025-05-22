import { RowLinksWithDropdown } from '~/components/RowLinksWithDropdown'
import { IAdapterChainPageData } from './types'
import { VirtualTable } from '~/components/Table/Table'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { Icon } from '~/components/Icon'
import {
	type ColumnDef,
	ColumnFiltersState,
	ColumnOrderState,
	type ColumnSizingState,
	type ExpandedState,
	getCoreRowModel,
	getExpandedRowModel,
	getFilteredRowModel,
	getSortedRowModel,
	type SortingState,
	useReactTable
} from '@tanstack/react-table'
import { useCallback, useEffect, useState } from 'react'
import { BasicLink } from '~/components/Link'
import { chainIconUrl, download, formattedNum } from '~/utils'
import { Tooltip } from '~/components/Tooltip'
import { TokenLogo } from '~/components/TokenLogo'
import { ICONS_CDN } from '~/constants'
import { getAnnualizedRatio } from '~/api/categories/adaptors'
import { AdaptorsSearch } from '~/components/Search/Adaptors'
import { Metrics } from '~/components/Metrics'

interface IProps extends IAdapterChainPageData {
	type: 'Revenue' | 'Holders Revenue'
}

export function ChainByAdapter2(props: IProps) {
	const [sorting, setSorting] = useState<SortingState>([{ desc: true, id: 'total24h' }])
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
	const [columnOrder, setColumnOrder] = useState<ColumnOrderState>([])
	const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({})
	const [expanded, setExpanded] = useState<ExpandedState>({})

	const instance = useReactTable({
		data: props.protocols,
		columns: columnsByType[props.type],
		state: {
			sorting,
			expanded,
			columnOrder,
			columnSizing,
			columnFilters
		},
		sortingFns: {
			alphanumericFalsyLast: (rowA, rowB, columnId) => {
				const desc = sorting.length ? sorting[0].desc : true

				let a = (rowA.getValue(columnId) ?? null) as any
				let b = (rowB.getValue(columnId) ?? null) as any

				if (typeof a === 'number' && a <= 0) a = null
				if (typeof b === 'number' && b <= 0) b = null

				if (a === null && b !== null) {
					return desc ? -1 : 1
				}

				if (a !== null && b === null) {
					return desc ? 1 : -1
				}

				if (a === null && b === null) {
					return 0
				}

				return a - b
			}
		},
		onExpandedChange: setExpanded,
		getSubRows: (row: IAdapterChainPageData['protocols'][0]) => row.childProtocols,
		onSortingChange: setSorting,
		onColumnOrderChange: setColumnOrder,
		onColumnSizingChange: setColumnSizing,
		onColumnFiltersChange: setColumnFilters,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getExpandedRowModel: getExpandedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		enableSortingRemoval: false
	})

	const [projectName, setProjectName] = useState('')

	useEffect(() => {
		const columns = instance.getColumn('name')

		const id = setTimeout(() => {
			if (columns) {
				columns.setFilterValue(projectName)
			}
		}, 200)

		return () => clearTimeout(id)
	}, [projectName, instance])

	const downloadCsv = useCallback(() => {
		const header = [
			'Protocol',
			'Category',
			'Chains',
			'Total 1d',
			'Total 7d',
			'Total 1m',
			'Total 1y',
			'Total All Time',
			'Market Cap'
		]
		const csvdata = props.protocols.map((protocol) => {
			return [
				protocol.name,
				protocol.category,
				protocol.chains.join(', '),
				protocol.total24h,
				protocol.total7d,
				protocol.total30d,
				protocol.total1y,
				protocol.totalAllTime,
				protocol.mcap
			]
		})
		const csv = [header, ...csvdata].map((row) => row.join(',')).join('\n')

		download(`${props.type}-${props.chain}-protocols.csv`, csv)
	}, [props])

	return (
		<>
			<AdaptorsSearch type={props.adaptorType} />
			<Metrics currentMetric={props.type} />
			<RowLinksWithDropdown links={props.chains} activeLink={props.chain} />
			<div className="bg-[var(--cards-bg)] rounded-md">
				<div className="flex items-center justify-end flex-wrap gap-4 p-3">
					<div className="relative w-full sm:max-w-[280px] mr-auto">
						<Icon
							name="search"
							height={16}
							width={16}
							className="absolute text-[var(--text3)] top-0 bottom-0 my-auto left-2"
						/>
						<input
							value={projectName}
							onChange={(e) => {
								setProjectName(e.target.value)
							}}
							placeholder="Search..."
							className="border border-[var(--form-control-border)] w-full pl-7 pr-2 py-[6px] bg-white dark:bg-black text-black dark:text-white rounded-md text-sm"
						/>
					</div>

					<CSVDownloadButton onClick={downloadCsv} className="min-h-8" />
				</div>

				<VirtualTable instance={instance} />
			</div>
		</>
	)
}

const defaultColumns: ColumnDef<IAdapterChainPageData['protocols'][0]>[] = [
	{
		id: 'name',
		header: 'Name',
		accessorKey: 'name',
		enableSorting: false,
		cell: ({ getValue, row, table }) => {
			const value = getValue() as string
			const index = row.depth === 0 ? table.getSortedRowModel().rows.findIndex((x) => x.id === row.id) : row.index
			const Chains = () => (
				<span className="flex flex-col gap-1">
					{row.original.chains.map((chain) => (
						<span key={`/protocol/${row.original.slug}` + chain} className="flex items-center gap-1">
							<TokenLogo logo={chainIconUrl(chain)} size={14} />
							<span>{chain}</span>
						</span>
					))}
				</span>
			)

			return (
				<span className={`flex items-center gap-2 relative ${row.depth > 0 ? 'pl-12' : 'pl-6'}`}>
					{row.subRows?.length > 0 ? (
						<button
							className="absolute -left-[2px]"
							{...{
								onClick: row.getToggleExpandedHandler()
							}}
						>
							{row.getIsExpanded() ? (
								<>
									<Icon name="chevron-down" height={16} width={16} />
									<span className="sr-only">View child protocols</span>
								</>
							) : (
								<>
									<Icon name="chevron-right" height={16} width={16} />
									<span className="sr-only">Hide child protocols</span>
								</>
							)}
						</button>
					) : null}

					<span className="flex-shrink-0">{index + 1}</span>

					<TokenLogo logo={`${ICONS_CDN}/protocols/${row.original.slug}?w=48&h=48`} data-lgonly />

					<span className="flex flex-col -my-2">
						<BasicLink
							href={`/protocol/${row.original.slug}`}
							className="text-sm font-medium text-[var(--link-text)] overflow-hidden whitespace-nowrap text-ellipsis hover:underline"
						>
							{value}
						</BasicLink>

						<Tooltip content={<Chains />} className="text-[0.7rem] text-[var(--text-disabled)]">
							{`${row.original.chains.length} chain${row.original.chains.length > 1 ? 's' : ''}`}
						</Tooltip>
					</span>
				</span>
			)
		},
		size: 240
	}
	// {
	// 	id: 'category',
	// 	header: 'Category',
	// 	accessorKey: 'category',
	// 	enableSorting: false,
	// 	cell: ({ getValue }) =>
	// 		getValue() ? (
	// 			<BasicLink
	// 				href={`/protocols/${slug(getValue() as string)}`}
	// 				className="text-sm font-medium text-[var(--link-text)]"
	// 			>
	// 				{getValue() as string}
	// 			</BasicLink>
	// 		) : (
	// 			''
	// 		),
	// 	size: 140,
	// 	meta: {
	// 		align: 'end'
	// 	}
	// }
	// {
	// 	header: '1d Change',
	// 	id: 'change_1d',
	// 	accessorFn: (protocol) => getPercentChange(protocol.total24h, protocol.total48hto24h),
	// 	enableSorting: true,
	// 	cell: (info) => <>{info.getValue() != null ? formattedPercent(info.getValue()) : null}</>,
	// 	size: 140,
	// 	meta: {
	// 		align: 'end'
	// 	}
	// },
	// {
	// 	header: '7d Change',
	// 	id: 'change_7d',
	// 	accessorFn: (protocol) => getPercentChange(protocol.total7d, protocol.total7DaysAgo),
	// 	enableSorting: true,
	// 	cell: (info) => <>{info.getValue() != null ? formattedPercent(info.getValue()) : null}</>,
	// 	size: 140,
	// 	meta: {
	// 		align: 'end'
	// 	}
	// },
	// {
	// 	header: '1m Change',
	// 	id: 'change_1m',
	// 	accessorFn: (protocol) => getPercentChange(protocol.total30d, protocol.total30DaysAgo),
	// 	enableSorting: true,
	// 	cell: (info) => <>{info.getValue() != null ? formattedPercent(info.getValue()) : null}</>,
	// 	size: 140,
	// 	meta: {
	// 		align: 'end'
	// 	}
	// }
]

const columnsByType: Record<IProps['type'], ColumnDef<IAdapterChainPageData['protocols'][0]>[]> = {
	Revenue: [
		...defaultColumns,
		{
			id: 'total24h',
			header: 'Revenue 24h',
			accessorKey: 'total24h',
			cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
			sortUndefined: 'last',
			meta: {
				align: 'end',
				headerHelperText: 'Revenue earned by the protocol in the last 24 hours'
			},
			size: 128
		},
		{
			id: 'total7d',
			header: 'Revenue 7d',
			accessorKey: 'total7d',
			cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
			sortUndefined: 'last',
			meta: {
				align: 'end',
				headerHelperText: 'Revenue earned by the protocol in the last 7 days'
			},
			size: 128
		},
		{
			id: 'total30d',
			header: 'Revenue 30d',
			accessorKey: 'total30d',
			cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
			sortUndefined: 'last',
			meta: {
				align: 'end',
				headerHelperText: 'Revenue earned by the protocol in the last 30 days'
			},
			size: 128
		},
		{
			id: 'totalAllTime',
			header: 'Cumulative Revenue',
			accessorKey: 'totalAllTime',
			cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
			sortUndefined: 'last',
			meta: {
				align: 'end',
				headerHelperText: 'All time revenue earned by the protocol'
			},
			size: 148
		},
		{
			id: 'ps',
			header: 'P/S',
			accessorFn: (protocol) => getAnnualizedRatio(protocol.mcap, protocol.total30d),
			cell: (info) => <>{info.getValue() != null ? info.getValue() + 'x' : null}</>,
			sortUndefined: 'last',
			meta: {
				align: 'end',
				headerHelperText: 'Market cap / annualized revenue'
			},
			size: 80
		}
	],
	'Holders Revenue': [
		...defaultColumns,
		{
			id: 'total24h',
			header: 'Revenue 24h',
			accessorKey: 'total24h',
			cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
			sortUndefined: 'last',
			meta: {
				align: 'end',
				headerHelperText: 'Revenue earned by token holders in the last 24 hours'
			},
			size: 128
		},
		{
			id: 'total7d',
			header: 'Revenue 7d',
			accessorKey: 'total7d',
			cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
			sortUndefined: 'last',
			meta: {
				align: 'end',
				headerHelperText: 'Revenue earned by token holders in the last 7 days'
			},
			size: 128
		},
		{
			id: 'total30d',
			header: 'Revenue 30d',
			accessorKey: 'total30d',
			cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
			sortUndefined: 'last',
			meta: {
				align: 'end',
				headerHelperText: 'Revenue earned by token holders in the last 30 days'
			},
			size: 128
		},
		{
			id: 'totalAllTime',
			header: 'Cumulative Revenue',
			accessorKey: 'totalAllTime',
			cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
			sortUndefined: 'last',
			meta: {
				align: 'end',
				headerHelperText: 'All time revenue earned by token holders'
			},
			size: 148
		}
	]
}
