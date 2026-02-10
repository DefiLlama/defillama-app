import {
	ColumnDef,
	ColumnFiltersState,
	ExpandedState,
	getCoreRowModel,
	getExpandedRowModel,
	getFilteredRowModel,
	getSortedRowModel,
	SortingState,
	useReactTable
} from '@tanstack/react-table'
import * as React from 'react'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { SelectWithCombobox } from '~/components/Select/SelectWithCombobox'
import { VirtualTable } from '~/components/Table/Table'
import { useTableSearch } from '~/components/Table/utils'
import { TokenLogo } from '~/components/TokenLogo'
import type { useGroupChainsPegged } from '~/containers/Stablecoins/hooks'
import { CHAINS_CATEGORY_GROUP_SETTINGS, useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import { chainIconUrl, formattedNum, renderPercentChange } from '~/utils'

type StablecoinsByChainRow = ReturnType<typeof useGroupChainsPegged>[number]
type DominanceCell = NonNullable<StablecoinsByChainRow['dominance']>

const stablecoinsByChainColumns: ColumnDef<StablecoinsByChainRow>[] = [
	{
		header: 'Name',
		accessorKey: 'name',
		enableSorting: false,
		cell: ({ getValue, row }) => {
			const value = getValue() as string
			const isSubRow = value.startsWith('Bridged from')

			return (
				<span
					className="relative flex items-center gap-2"
					style={{ paddingLeft: row.depth ? row.depth * 48 : row.depth === 0 ? 24 : 0 }}
				>
					{row.subRows?.length > 0 && (
						<button
							className="absolute -left-0.5"
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
					)}

					{isSubRow ? (
						<>
							<span className="vf-row-index shrink-0" aria-hidden="true" />
							<span>{value}</span>
						</>
					) : (
						<>
							<span className="vf-row-index shrink-0" aria-hidden="true" />
							<TokenLogo logo={chainIconUrl(value)} data-lgonly />
							<BasicLink
								href={`/stablecoins/${value}`}
								className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text) hover:underline"
							>
								{value}
							</BasicLink>
						</>
					)}
				</span>
			)
		},
		size: 200
	},
	{
		header: '7d Change',
		accessorKey: 'change_7d',
		cell: (info) => <>{renderPercentChange(info.getValue())}</>,
		size: 120,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Stables Mcap',
		accessorKey: 'mcap',
		cell: ({ getValue }) => <>{formattedNum(getValue(), true)}</>,
		size: 132,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Dominant Stablecoin',
		accessorKey: 'dominance',
		enableSorting: false,
		cell: ({ getValue }) => {
			const value = getValue() as DominanceCell | null

			if (!value) {
				return null
			}

			return (
				<div className="flex w-full items-center justify-end gap-1">
					<span>{`${value.name}${value.value ? ':' : ''}`}</span>
					<span>{renderPercentChange(value.value, true)}</span>
				</div>
			)
		},
		size: 170,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Total Mcap Issued On',
		accessorKey: 'minted',
		cell: ({ getValue }) => <>{formattedNum(getValue(), true)}</>,
		size: 180,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Total Mcap Bridged To',
		accessorKey: 'bridgedTo',
		cell: ({ getValue }) => <>{formattedNum(getValue(), true)}</>,
		size: 185,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Stables Mcap / DeFi Tvl',
		accessorKey: 'mcaptvl',
		cell: ({ getValue }) => <>{getValue() && formattedNum(getValue(), false)}</>,
		size: 195,
		meta: {
			align: 'end'
		}
	}
]

export function StablecoinsChainsTable({ data }: { data: StablecoinsByChainRow[] }) {
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
	const [sorting, setSorting] = React.useState<SortingState>([{ id: 'mcap', desc: true }])
	const [expanded, setExpanded] = React.useState<ExpandedState>({})

	const instance = useReactTable({
		data,
		columns: stablecoinsByChainColumns,
		state: {
			sorting,
			expanded,
			columnFilters
		},
		defaultColumn: {
			sortUndefined: 'last'
		},
		onExpandedChange: setExpanded,
		getSubRows: (row: StablecoinsByChainRow) => row.subRows,
		onSortingChange: setSorting,
		onColumnFiltersChange: setColumnFilters,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getExpandedRowModel: getExpandedRowModel(),
		getFilteredRowModel: getFilteredRowModel()
	})

	const [projectName, setProjectName] = useTableSearch({ instance, columnToSearch: 'name' })
	const [groupTvls, updater] = useLocalStorageSettingsManager('tvl_chains')

	const setAggrOptions = (selectedKeys: string[]) => {
		const selectedSet = new Set(selectedKeys)
		for (const item of CHAINS_CATEGORY_GROUP_SETTINGS) {
			const shouldEnable = selectedSet.has(item.key)
			if (groupTvls[item.key] !== shouldEnable) {
				updater(item.key)
			}
		}
	}

	const selectedAggregateTypes = React.useMemo(() => {
		return CHAINS_CATEGORY_GROUP_SETTINGS.flatMap((key) => (groupTvls[key.key] ? [key.key] : []))
	}, [groupTvls])

	return (
		<div className="rounded-md border border-(--cards-border) bg-(--cards-bg)">
			<div className="flex items-center justify-between p-3">
				<label className="relative mr-auto w-full sm:max-w-[280px]">
					<span className="sr-only">Search</span>
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
						placeholder="Search..."
						className="w-full rounded-md border border-(--form-control-border) bg-white p-1 pl-7 text-black dark:bg-black dark:text-white"
					/>
				</label>
				<SelectWithCombobox
					allValues={CHAINS_CATEGORY_GROUP_SETTINGS}
					selectedValues={selectedAggregateTypes}
					setSelectedValues={setAggrOptions}
					nestedMenu={false}
					label={'Group Chains'}
					labelType="smol"
					variant="filter-responsive"
				/>
			</div>
			<VirtualTable instance={instance} />
		</div>
	)
}
