import * as React from 'react'
import { useRouter } from 'next/router'
import {
	ColumnDef,
	ColumnFiltersState,
	ColumnSizingState,
	ExpandedState,
	getCoreRowModel,
	getExpandedRowModel,
	getFilteredRowModel,
	getSortedRowModel,
	SortingState,
	useReactTable
} from '@tanstack/react-table'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { ProtocolCategoryFilter } from '~/components/Filters/ProtocolCategoryFilter'
import { TVLRange } from '~/components/Filters/TVLRange'
import { Icon } from '~/components/Icon'
import { SelectWithCombobox } from '~/components/SelectWithCombobox'
import { Switch } from '~/components/Switch'
import { columnSizes, protocolsColumns } from '~/components/Table/Defi/Protocols/columns'
import { IProtocolRow } from '~/components/Table/Defi/Protocols/types'
import { VirtualTable } from '~/components/Table/Table'
import useWindowSize from '~/hooks/useWindowSize'
import { formattedNum, toNiceDaysAgo } from '~/utils'

export function RecentlyListedProtocolsTable({
	data,
	fullProtocolList,
	queries,
	selectedChains,
	chainList,
	forkedList
}: {
	data: Array<IProtocolRow>
	fullProtocolList: Array<IProtocolRow>
	queries: {
		[key: string]: string | string[]
	}
	selectedChains: Array<string>
	chainList: Array<string>
	forkedList: {
		[name: string]: boolean
	}
}) {
	const [sorting, setSorting] = React.useState<SortingState>([{ desc: true, id: 'listedAt' }])
	const [columnSizing, setColumnSizing] = React.useState<ColumnSizingState>({})
	const [expanded, setExpanded] = React.useState<ExpandedState>({})
	const windowSize = useWindowSize()
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])

	const router = useRouter()

	const instance = useReactTable({
		data,
		columns: router.pathname === '/airdrops' ? airdropsColumns : recentlyListedProtocolsColumns,
		state: {
			sorting,
			expanded,
			columnSizing,
			columnFilters
		},
		onExpandedChange: setExpanded,
		getSubRows: (row: IProtocolRow) => row.subRows,
		onSortingChange: setSorting,
		onColumnSizingChange: setColumnSizing,
		onColumnFiltersChange: setColumnFilters,
		getFilteredRowModel: getFilteredRowModel(),
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getExpandedRowModel: getExpandedRowModel()
	})

	React.useEffect(() => {
		const cSize = windowSize.width
			? columnSizesKeys.find((size) => windowSize.width > Number(size))
			: columnSizesKeys[0]

		instance.setColumnSizing(columnSizes[cSize])
	}, [windowSize, instance])
	const [projectName, setProjectName] = React.useState('')

	React.useEffect(() => {
		const columns = instance.getColumn('name')

		const id = setTimeout(() => {
			columns.setFilterValue(projectName)
		}, 200)

		return () => clearTimeout(id)
	}, [projectName, instance])

	const selectChain = (newChain) => {
		router.push(
			{
				pathname: router.pathname,
				query: {
					...queries,
					chain: newChain
				}
			},
			undefined,
			{ shallow: true }
		)
	}

	const clearAllChains = () => {
		router.push(
			{
				pathname: router.pathname,
				query: {
					...queries,
					chain: 'None'
				}
			},
			undefined,
			{ shallow: true }
		)
	}

	const toggleAllChains = () => {
		router.push(
			{
				pathname: router.pathname,
				query: {
					...queries,
					chain: 'All'
				}
			},
			undefined,
			{ shallow: true }
		)
	}

	const selectOnlyOneChain = (option: string) => {
		router.push(
			{
				pathname: router.pathname,
				query: {
					...queries,
					chain: option
				}
			},
			undefined,
			{ shallow: true }
		)
	}

	const prepareCsv = React.useCallback(() => {
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
	}, [data])

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
						className="w-full rounded-md border border-(--form-control-border) bg-white p-1 pl-7 text-black max-sm:py-0.5 dark:bg-black dark:text-white"
					/>
				</label>

				<div className="flex items-start gap-2 max-sm:w-full max-sm:flex-col sm:items-center">
					<div className="flex w-full items-center gap-2 sm:w-auto">
						<ProtocolCategoryFilter protocols={fullProtocolList} />
						<SelectWithCombobox
							label="Chains"
							allValues={chainList}
							clearAll={clearAllChains}
							toggleAll={toggleAllChains}
							selectOnlyOne={selectOnlyOneChain}
							selectedValues={selectedChains}
							setSelectedValues={selectChain}
							labelType="smol"
							triggerProps={{
								className:
									'flex items-center justify-between gap-2 px-2 py-1.5 text-xs rounded-md cursor-pointer flex-nowrap relative border border-(--form-control-border) text-(--text-form) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) font-medium w-full sm:w-auto'
							}}
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
	cell: ({ getValue }) => toNiceDaysAgo(getValue()),
	sortUndefined: 'last' as const,
	size: 140,
	meta: {
		align: 'end' as const
	}
}

const recentlyListedProtocolsColumns: ColumnDef<IProtocolRow>[] = [
	...protocolsColumns.slice(0, 3),
	listedAtColumn,
	...protocolsColumns.slice(3, -1).filter((c: any) => !['volume_7d', 'fees_7d', 'revenue_7d'].includes(c.accessorKey))
]

const airdropsColumns: ColumnDef<IProtocolRow>[] = [
	...protocolsColumns.slice(0, 3),
	{
		header: 'Total Money Raised',
		accessorKey: 'totalRaised',
		cell: ({ getValue }) => <>{getValue() ? formattedNum(getValue(), true) : ''}</>,
		sortUndefined: 'last',
		size: 180,
		meta: {
			align: 'end' as const
		}
	},
	listedAtColumn,
	...protocolsColumns.slice(3, -1).filter((c: any) => !['volume_7d', 'fees_7d', 'revenue_7d'].includes(c.accessorKey))
]

const columnSizesKeys = Object.keys(columnSizes)
	.map((x) => Number(x))
	.sort((a, b) => Number(b) - Number(a))

function HideForkedProtocols() {
	const router = useRouter()

	const { hideForks } = router.query

	const toHide = hideForks && typeof hideForks === 'string' && hideForks === 'true' ? false : true

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
