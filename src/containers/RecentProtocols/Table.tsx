import * as React from 'react'
import {
	useReactTable,
	SortingState,
	getCoreRowModel,
	getSortedRowModel,
	ExpandedState,
	getExpandedRowModel,
	ColumnSizingState,
	ColumnFiltersState,
	getFilteredRowModel,
	ColumnDef
} from '@tanstack/react-table'
import { VirtualTable } from '~/components/Table/Table'
import useWindowSize from '~/hooks/useWindowSize'
import { useRouter } from 'next/router'
import { Icon } from '~/components/Icon'
import { IProtocolRow } from '~/components/Table/Defi/Protocols/types'
import { listedAtColumn, protocolsColumns, columnSizes } from '~/components/Table/Defi/Protocols/columns'
import { formattedNum } from '~/utils'
import { SelectWithCombobox } from '~/components/SelectWithCombobox'
import { Switch } from '~/components/Switch'
import { TVLRange } from '~/components/Filters/TVLRange'

export function RecentlyListedProtocolsTable({
	data,
	queries,
	selectedChains,
	chainList,
	forkedList
}: {
	data: Array<IProtocolRow>
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

	return (
		<div className="bg-[var(--cards-bg)] rounded-md">
			<div className="flex items-center justify-end flex-wrap gap-2 p-3">
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
						placeholder="Search protocols..."
						className="border border-[var(--form-control-border)] w-full pl-7 pr-2 py-[6px] bg-white dark:bg-black text-black dark:text-white rounded-md text-sm"
					/>
				</div>
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
							'flex items-center justify-between gap-2 p-2 text-xs rounded-md cursor-pointer flex-nowrap relative border border-[var(--form-control-border)] text-[#666] dark:text-[#919296] hover:bg-[var(--link-hover-bg)] focus-visible:bg-[var(--link-hover-bg)] font-medium'
					}}
				/>
				<TVLRange variant="third" />
				{forkedList ? <HideForkedProtocols /> : null}
			</div>
			<VirtualTable instance={instance} />
		</div>
	)
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
