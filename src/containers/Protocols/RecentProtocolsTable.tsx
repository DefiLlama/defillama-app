import {
	type ColumnDef,
	type ColumnFiltersState,
	type ColumnSizingState,
	type ExpandedState,
	getCoreRowModel,
	getExpandedRowModel,
	getFilteredRowModel,
	getSortedRowModel,
	type SortingState,
	useReactTable
} from '@tanstack/react-table'
import { useRouter } from 'next/router'
import * as React from 'react'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { TVLRange } from '~/components/Filters/TVLRange'
import { Icon } from '~/components/Icon'
import { SelectWithCombobox } from '~/components/Select/SelectWithCombobox'
import { Switch } from '~/components/Switch'
import { columnSizes, protocolsColumns } from '~/components/Table/Defi/Protocols/columns'
import type { IProtocolRow } from '~/components/Table/Defi/Protocols/types'
import { VirtualTable } from '~/components/Table/Table'
import { useSortColumnSizesAndOrders, useTableSearch } from '~/components/Table/utils'
import { formattedNum, toNiceDaysAgo } from '~/utils'
import type { IRecentProtocol } from './types'

/** Row type after applyExtraTvl adds change/mcaptvl fields. */
type RecentProtocolTableRow = IRecentProtocol & {
	change_1d: number | null
	change_7d: number | null
	change_1m: number | null
	mcaptvl: number | null
}

export function RecentlyListedProtocolsTable({
	data,
	selectedChains,
	chainList,
	forkedList
}: {
	data: RecentProtocolTableRow[]
	queries: {
		[key: string]: string | string[]
	}
	selectedChains: Array<string>
	chainList: Array<string>
	forkedList?: Record<string, boolean>
}) {
	const [sorting, setSorting] = React.useState<SortingState>([{ desc: true, id: 'listedAt' }])
	const [columnSizing, setColumnSizing] = React.useState<ColumnSizingState>({})
	const [expanded, setExpanded] = React.useState<ExpandedState>({})
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])

	const router = useRouter()

	/**
	 * protocolsColumns is typed as ColumnDef<IProtocolRow>[], but our RecentProtocolTableRow
	 * is structurally compatible for all fields the columns actually access (name, tvl,
	 * change_1d/7d/1m, mcap, mcaptvl, chains, deprecated, listedAt, category, etc.).
	 * We cast here because IProtocolRow has a legacy chainTvls intersection type that is
	 * unsatisfiable by any real data shape.
	 */
	const columns = (
		router.pathname === '/airdrops' ? airdropsColumns : recentlyListedProtocolsColumns
	) as unknown as ColumnDef<RecentProtocolTableRow>[]

	const instance = useReactTable({
		data,
		columns,
		state: {
			sorting,
			expanded,
			columnSizing,
			columnFilters
		},
		defaultColumn: {
			sortUndefined: 'last'
		},
		onExpandedChange: setExpanded,
		onSortingChange: setSorting,
		onColumnSizingChange: setColumnSizing,
		onColumnFiltersChange: setColumnFilters,
		getFilteredRowModel: getFilteredRowModel(),
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getExpandedRowModel: getExpandedRowModel()
	})

	useSortColumnSizesAndOrders({ instance, columnSizes })

	const [projectName, setProjectName] = useTableSearch({ instance, columnToSearch: 'name' })

	const prepareCsv = () => {
		const headers = ['Name', 'TVL', 'Change 1d', 'Change 7d', 'Change 1m', 'Listed At', 'Chains']
		const csvData = data.map((row) => {
			return {
				Name: row.name,
				Chains: row.chains.join(', '),
				TVL: row.tvl,
				'Change 1d': row.change_1d,
				'Change 7d': row.change_7d,
				'Change 1m': row.change_1m,
				'Listed At': new Date(row.listedAt * 1000).toLocaleDateString()
			}
		})
		const rows = [headers, ...csvData.map((row) => headers.map((header) => row[header]))]
		return { filename: 'protocols.csv', rows: rows as (string | number | boolean)[][] }
	}

	return (
		<div className="rounded-md border border-(--cards-border) bg-(--cards-bg)">
			<div className="flex flex-wrap items-center justify-end gap-2 p-3">
				<label className="relative mr-auto w-full sm:max-w-[280px]">
					<span className="sr-only">Search protocols</span>
					<Icon
						name="search"
						height={16}
						width={16}
						className="absolute top-0 bottom-0 left-2 my-auto text-(--text-tertiary)"
					/>
					<input
						value={projectName}
						onChange={(e) => {
							setProjectName(e.target.value)
						}}
						placeholder="Search protocols..."
						className="w-full rounded-md border border-(--form-control-border) bg-white p-1 pl-7 text-black dark:bg-black dark:text-white"
					/>
				</label>

				<div className="flex items-start gap-2 max-sm:w-full max-sm:flex-col sm:items-center">
					<div className="flex w-full items-center gap-2 sm:w-auto">
						<SelectWithCombobox
							label="Chains"
							allValues={chainList}
							selectedValues={selectedChains}
							includeQueryKey="chain"
							excludeQueryKey="excludeChain"
							labelType="smol"
							variant="filter-responsive"
						/>
						<TVLRange triggerClassName="w-full sm:w-auto" />
					</div>

					{forkedList ? <HideForkedProtocols /> : null}

					<CSVDownloadButton prepareCsv={prepareCsv} />
				</div>
			</div>
			<VirtualTable instance={instance} />
		</div>
	)
}

const listedAtColumn: ColumnDef<IProtocolRow> = {
	header: 'Listed At',
	accessorKey: 'listedAt',
	cell: ({ getValue }) => toNiceDaysAgo(getValue() as number),
	size: 140,
	meta: {
		align: 'end' as const
	}
}

const recentlyListedProtocolsColumns: ColumnDef<IProtocolRow>[] = [
	...protocolsColumns.slice(0, 3),
	listedAtColumn,
	...protocolsColumns.slice(3, -1).filter((c: ColumnDef<IProtocolRow>) => {
		const key = 'accessorKey' in c ? c.accessorKey : undefined
		return !['volume_7d', 'fees_7d', 'revenue_7d'].includes(key as string)
	})
]

const airdropsColumns: ColumnDef<IProtocolRow>[] = [
	...protocolsColumns.slice(0, 3),
	{
		header: 'Total Money Raised',
		accessorKey: 'totalRaised',
		cell: ({ getValue }) => <>{getValue() ? formattedNum(getValue(), true) : ''}</>,
		size: 180,
		meta: {
			align: 'end' as const
		}
	},
	listedAtColumn,
	...protocolsColumns.slice(3, -1).filter((c: ColumnDef<IProtocolRow>) => {
		const key = 'accessorKey' in c ? c.accessorKey : undefined
		return !['volume_7d', 'fees_7d', 'revenue_7d'].includes(key as string)
	})
]

function HideForkedProtocols() {
	const router = useRouter()

	const { hideForks } = router.query

	const toHide = !(hideForks && typeof hideForks === 'string' && hideForks === 'true')

	const hide = () => {
		router.push(
			{
				pathname: router.pathname,
				query: {
					...router.query,
					hideForks: toHide
				}
			},
			undefined,
			{ shallow: true }
		)
	}
	return <Switch label="Hide Forked Protocols" value="hideForks" checked={!toHide} onChange={hide} />
}
