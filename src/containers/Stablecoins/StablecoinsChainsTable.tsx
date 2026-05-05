import {
	type ColumnFiltersState,
	createColumnHelper,
	type ExpandedState,
	getCoreRowModel,
	getExpandedRowModel,
	getFilteredRowModel,
	getSortedRowModel,
	type SortingState,
	useReactTable
} from '@tanstack/react-table'
import * as React from 'react'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { PercentChange } from '~/components/PercentChange'
import { SelectWithCombobox } from '~/components/Select/SelectWithCombobox'
import { VirtualTable } from '~/components/Table/Table'
import { prepareTableCsv, useTableSearch } from '~/components/Table/utils'
import { TokenLogo } from '~/components/TokenLogo'
import type { useGroupChainsPegged } from '~/containers/Stablecoins/hooks'
import { CHAINS_CATEGORY_GROUP_SETTINGS, useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import { formattedNum, slug } from '~/utils'

type StablecoinsByChainRow = ReturnType<typeof useGroupChainsPegged>[number]
type DominanceCell = NonNullable<StablecoinsByChainRow['dominance']>
const columnHelper = createColumnHelper<StablecoinsByChainRow>()

const stablecoinsByChainColumns = [
	columnHelper.accessor('name', {
		header: 'Name',
		enableSorting: false,
		cell: ({ getValue, row }) => {
			const value = getValue()
			const isSubRow = value.startsWith('Bridged from')

			return (
				<span
					className="relative flex items-center gap-2"
					style={{ paddingLeft: row.depth ? row.depth * 48 : row.depth === 0 ? 24 : 0 }}
				>
					{row.subRows?.length > 0 ? (
						<button
							className="absolute -left-0.5"
							{...{
								onClick: row.getToggleExpandedHandler()
							}}
						>
							{row.getIsExpanded() ? (
								<>
									<Icon name="chevron-down" height={16} width={16} />
									<span className="sr-only">Hide child protocols</span>
								</>
							) : (
								<>
									<Icon name="chevron-right" height={16} width={16} />
									<span className="sr-only">View child protocols</span>
								</>
							)}
						</button>
					) : null}

					{isSubRow ? (
						<>
							<span className="vf-row-index shrink-0" aria-hidden="true" />
							<span>{value}</span>
						</>
					) : (
						<>
							<span className="vf-row-index shrink-0" aria-hidden="true" />
							<TokenLogo name={value} kind="chain" data-lgonly alt={`Logo of ${value}`} />
							<BasicLink
								href={`/stablecoins/${slug(value)}`}
								className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text) hover:underline"
							>
								{value}
							</BasicLink>
						</>
					)}
				</span>
			)
		},
		meta: {
			headerClassName: 'w-[min(200px,40vw)]'
		}
	}),
	columnHelper.accessor('change_7d', {
		header: '7d Change',
		cell: (info) => <PercentChange percent={info.getValue()} />,
		meta: {
			headerClassName: 'w-[120px]',
			align: 'end'
		}
	}),
	columnHelper.accessor('mcap', {
		header: 'Stables Mcap',
		cell: (info) => formattedNum(info.getValue(), true),
		meta: {
			headerClassName: 'w-[132px]',
			align: 'end'
		}
	}),
	columnHelper.accessor(
		(row) => {
			const value = row.dominance
			if (!value) return ''
			return `${value.name}${value.value != null ? `: ${value.value}%` : ''}`
		},
		{
			id: 'dominance',
			header: 'Dominant Stablecoin',
			enableSorting: false,
			cell: ({ row }) => {
				const value = row.original.dominance as DominanceCell | null

				if (!value) {
					return null
				}

				return (
					<div className="flex w-full items-center justify-end gap-1">
						<span>{`${value.name}${value.value ? ':' : ''}`}</span>
						<span>
							<PercentChange percent={value.value} noSign />
						</span>
					</div>
				)
			},
			meta: {
				headerClassName: 'w-[170px]',
				align: 'end'
			}
		}
	),
	columnHelper.accessor('minted', {
		header: 'Total Mcap Issued On',
		cell: (info) => formattedNum(info.getValue(), true),
		meta: {
			headerClassName: 'w-[min(180px,40vw)]',
			align: 'end'
		}
	}),
	columnHelper.accessor('bridgedTo', {
		header: 'Total Mcap Bridged To',
		cell: (info) => formattedNum(info.getValue(), true),
		meta: {
			headerClassName: 'w-[min(185px,40vw)]',
			align: 'end'
		}
	}),
	columnHelper.accessor('mcaptvl', {
		header: 'Stables Mcap / DeFi Tvl',
		cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), false) : null),
		meta: {
			headerClassName: 'w-[min(195px,40vw)]',
			align: 'end'
		}
	})
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
		enableSortingRemoval: false,
		onExpandedChange: (updater) => React.startTransition(() => setExpanded(updater)),
		getSubRows: (row: StablecoinsByChainRow) => row.subRows,
		onSortingChange: (updater) => React.startTransition(() => setSorting(updater)),
		onColumnFiltersChange: (updater) => React.startTransition(() => setColumnFilters(updater)),
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getExpandedRowModel: getExpandedRowModel(),
		getFilteredRowModel: getFilteredRowModel()
	})

	const [_projectName, setProjectName] = useTableSearch({ instance, columnToSearch: 'name' })
	const [groupTvls, updater] = useLocalStorageSettingsManager('tvl_chains')

	const setAggrOptions: React.Dispatch<React.SetStateAction<string[]>> = (action) => {
		const selectedKeys = typeof action === 'function' ? action(selectedAggregateTypes) : action
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
						onInput={(e) => setProjectName(e.currentTarget.value)}
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
				<CSVDownloadButton prepareCsv={() => prepareTableCsv({ instance, filename: 'stablecoins-chains' })} smol />
			</div>
			<VirtualTable instance={instance} />
		</div>
	)
}
