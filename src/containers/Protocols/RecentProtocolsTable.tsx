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
import { useRouter } from 'next/router'
import * as React from 'react'
import { Bookmark } from '~/components/Bookmark'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { TVLRange } from '~/components/Filters/TVLRange'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { PercentChange } from '~/components/PercentChange'
import { QuestionHelper } from '~/components/QuestionHelper'
import { SelectWithCombobox } from '~/components/Select/SelectWithCombobox'
import { Switch } from '~/components/Switch'
import { VirtualTable } from '~/components/Table/Table'
import { prepareTableCsv, useTableSearch } from '~/components/Table/utils'
import { TokenLogo } from '~/components/TokenLogo'
import { Tooltip } from '~/components/Tooltip'
import { getCategoryRoute, removedCategoriesFromChainTvlSet } from '~/constants'
import { useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import { formattedNum, slug, toNiceDaysAgo } from '~/utils'
import { pushShallowQuery } from '~/utils/routerQuery'
import type { IRecentProtocol } from './types'

/** Row type after applyExtraTvl adds change/mcaptvl fields. */
type RecentProtocolTableRow = IRecentProtocol & {
	change_1d: number | null
	change_7d: number | null
	change_1m: number | null
	mcaptvl: number | null
}
const columnHelper = createColumnHelper<RecentProtocolTableRow>()

function normaliseCategoryFilterValues(values: unknown): string[] {
	if (Array.isArray(values)) {
		return values.filter((value): value is string => typeof value === 'string')
	}

	if (typeof values === 'string') {
		return [values]
	}

	return []
}

function areCategoryFiltersEqual(current: unknown, next: string[] | undefined): boolean {
	const currentValues = normaliseCategoryFilterValues(current).map((value) => value.toLowerCase())
	const nextValues = (next ?? []).map((value) => value.toLowerCase())

	if (currentValues.length !== nextValues.length) return false

	const currentSet = new Set(currentValues)
	for (const value of nextValues) {
		if (!currentSet.has(value)) return false
	}

	return true
}

export function RecentlyListedProtocolsTable({
	data,
	selectedChains,
	selectedCategories,
	chainList,
	categories,
	forkedList
}: {
	data: RecentProtocolTableRow[]
	selectedChains: Array<string>
	selectedCategories: Array<string>
	chainList: Array<string>
	categories: Array<string>
	forkedList?: Record<string, boolean>
}) {
	const [sorting, setSorting] = React.useState<SortingState>([{ desc: true, id: 'listedAt' }])
	const [expanded, setExpanded] = React.useState<ExpandedState>({})
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])

	const router = useRouter()
	const csvFileName = router.pathname === '/airdrops' ? 'airdrops' : 'protocols'

	const columns = router.pathname === '/airdrops' ? airdropsColumns : recentlyListedProtocolsColumns

	const instance = useReactTable({
		data,
		columns,
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
		onSortingChange: (updater) => React.startTransition(() => setSorting(updater)),
		onColumnFiltersChange: (updater) => React.startTransition(() => setColumnFilters(updater)),
		getFilteredRowModel: getFilteredRowModel(),
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getExpandedRowModel: getExpandedRowModel()
	})

	const [_projectName, setProjectName] = useTableSearch({ instance, columnToSearch: 'name' })

	React.useEffect(() => {
		const categoryColumn = instance.getColumn('category')
		if (!categoryColumn || categories.length === 0) return

		const categoryFilterValues = selectedCategories.filter((selectedCategory) => {
			const lowerCategory = selectedCategory.toLowerCase()
			return lowerCategory !== 'all' && lowerCategory !== 'none'
		})
		const nextFilterValue = categoryFilterValues.length === categories.length ? undefined : categoryFilterValues

		if (areCategoryFiltersEqual(categoryColumn.getFilterValue(), nextFilterValue)) return

		React.startTransition(() => {
			categoryColumn.setFilterValue(nextFilterValue)
		})
	}, [instance, categories, selectedCategories])

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
						onInput={(e) => setProjectName(e.currentTarget.value)}
						placeholder="Search protocols..."
						className="w-full rounded-md border border-(--form-control-border) bg-white p-1 pl-7 text-black dark:bg-black dark:text-white"
					/>
				</label>

				<div className="flex items-start gap-2 max-sm:w-full max-sm:flex-col sm:items-center">
					{forkedList ? <HideForkedProtocols /> : null}

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
						{categories.length > 0 ? (
							<SelectWithCombobox
								label="Category"
								allValues={categories}
								selectedValues={selectedCategories}
								includeQueryKey="category"
								excludeQueryKey="excludeCategory"
								labelType="smol"
								variant="filter-responsive"
							/>
						) : null}
						<TVLRange triggerClassName="w-full sm:w-auto" />
					</div>

					<CSVDownloadButton prepareCsv={() => prepareTableCsv({ instance, filename: csvFileName })} smol />
				</div>
			</div>
			<VirtualTable instance={instance} />
		</div>
	)
}

const whiteLabeledVaultProviders = new Set(['Veda'])

const ProtocolChainsComponent = ({ chains }: { chains: string[] }) => (
	<span className="flex flex-col gap-1">
		{chains.map((chain) => (
			<span key={`chain${chain}-of-protocol`} className="flex items-center gap-1">
				<TokenLogo name={chain} kind="chain" size={14} alt={`Logo of ${chain}`} />
				<span>{chain}</span>
			</span>
		))}
	</span>
)

const protocolsColumns = [
	columnHelper.accessor('name', {
		header: 'Name',
		enableSorting: false,
		cell: ({ getValue, row }) => {
			const value = getValue()

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
					) : (
						<Bookmark readableName={value} data-lgonly data-bookmark />
					)}

					<span className="vf-row-index shrink-0" aria-hidden="true" />

					<TokenLogo name={value} kind="token" data-lgonly alt={`Logo of ${value}`} />

					<span className="-my-2 flex flex-col">
						{row.original?.deprecated ? (
							<BasicLink
								href={`/protocol/${slug(value)}`}
								className="flex items-center gap-1 overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text) hover:underline"
							>
								<span className="overflow-hidden text-ellipsis whitespace-nowrap hover:underline">{value}</span>
								<Tooltip content="Deprecated" className="text-(--error)">
									<Icon name="alert-triangle" height={14} width={14} />
								</Tooltip>
							</BasicLink>
						) : (
							<BasicLink
								href={`/protocol/${slug(value)}`}
								className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text) hover:underline"
							>
								{`${value}`}
							</BasicLink>
						)}

						<Tooltip content={<ProtocolChainsComponent chains={row.original.chains} />} className="text-[0.7rem]">
							{`${row.original.chains.length} chain${row.original.chains.length > 1 ? 's' : ''}`}
						</Tooltip>
					</span>
					{value === 'SyncDEX Finance' ? (
						<Tooltip content={'Many users have reported issues with this protocol'}>
							<Icon name="alert-triangle" height={14} width={14} />
						</Tooltip>
					) : null}
				</span>
			)
		},
		meta: {
			headerClassName: 'w-[180px] lg:w-[240px] xl:w-[200px]'
		}
	}),
	columnHelper.accessor('category', {
		header: 'Category',
		filterFn: (row, columnId, filterValue) => {
			const selectedCategories = normaliseCategoryFilterValues(filterValue)
			if (selectedCategories.length === 0) return false

			const rowCategory = `${row.getValue(columnId) ?? ''}`.toLowerCase()
			for (const selectedCategory of selectedCategories) {
				if (rowCategory === selectedCategory.toLowerCase()) return true
			}

			return false
		},
		cell: ({ getValue }) => {
			const value = getValue()
			return value ? (
				<BasicLink
					href={getCategoryRoute(slug(value))}
					className="text-sm font-medium whitespace-nowrap text-(--link-text)"
				>
					{value}
				</BasicLink>
			) : (
				''
			)
		},
		meta: {
			headerClassName: 'w-[140px]'
		}
	}),
	columnHelper.accessor('tvl', {
		header: 'TVL',
		cell: ({ getValue, row }) => <ProtocolTvlCell value={getValue()} rowValues={row.original} />,
		meta: {
			headerClassName: 'w-[120px]',
			align: 'end',
			headerHelperText: 'Sum of value of all coins held in smart contracts of the protocol'
		}
	}),
	columnHelper.accessor('change_1d', {
		header: '1d TVL Change',
		cell: ({ getValue }) => <PercentChange percent={getValue()} />,
		meta: {
			headerClassName: 'w-[140px]',
			align: 'end',
			headerHelperText: 'Change in TVL in the last 24 hours'
		}
	}),
	columnHelper.accessor('change_7d', {
		header: '7d TVL Change',
		cell: ({ getValue }) => <PercentChange percent={getValue()} />,
		meta: {
			headerClassName: 'w-[140px]',
			align: 'end',
			headerHelperText: 'Change in TVL in the last 7 days'
		}
	}),
	columnHelper.accessor('change_1m', {
		header: '1m TVL Change',
		cell: ({ getValue }) => <PercentChange percent={getValue()} />,
		meta: {
			headerClassName: 'w-[140px]',
			align: 'end',
			headerHelperText: 'Change in TVL in the last 30 days'
		}
	}),
	columnHelper.accessor('mcaptvl', {
		header: 'Mcap/TVL',
		cell: (info) => <>{info.getValue() ?? null}</>,
		meta: {
			headerClassName: 'w-[110px]',
			align: 'end'
		}
	})
]
type ProtocolTvlRow = RecentProtocolTableRow & {
	strikeTvl?: boolean
	parentExcluded?: boolean
	isParentProtocol?: boolean
}

function ProtocolTvlCell({ value, rowValues }: { value: unknown; rowValues: ProtocolTvlRow }) {
	const [extraTvlsEnabled] = useLocalStorageSettingsManager('tvl')
	const tvlValue = typeof value === 'number' ? value : null

	let text: string | null = null

	if (rowValues.strikeTvl) {
		if (!extraTvlsEnabled['doublecounted']) {
			text =
				'This protocol deposits into another protocol and is subtracted from total TVL because "Double Count" toggle is off'
		}

		if (!extraTvlsEnabled['liquidstaking']) {
			text =
				'This protocol is under Liquid Staking category and is subtracted from total TVL because "Liquid Staking" toggle is off'
		}

		if (!extraTvlsEnabled['doublecounted'] && !extraTvlsEnabled['liquidstaking']) {
			text =
				'This protocol deposits into another protocol or is under Liquid Staking category, so it is subtracted from total TVL because both "Liquid Staking" and "Double Count" toggles are off'
		}

		if (whiteLabeledVaultProviders.has(rowValues.name)) {
			text =
				'This protocol issues white-labeled vaults which may result in TVL being counted by another protocol (e.g., double counted).'
		}

		if (removedCategoriesFromChainTvlSet.has(rowValues.category)) {
			text = `${rowValues.category} protocols are not counted into Chain TVL`
		}

		if (text && rowValues.isParentProtocol) {
			text = 'Some sub-protocols are excluded from chain tvl'
		}
	}

	if (!text && !rowValues.parentExcluded) {
		return <>{tvlValue != null ? formattedNum(tvlValue, true) : null}</>
	}

	return (
		<span className="flex items-center justify-end gap-1">
			{text ? <QuestionHelper text={text} /> : null}
			{rowValues.parentExcluded ? (
				<QuestionHelper
					text={"There's some internal doublecounting that is excluded from parent TVL, so sum won't match"}
				/>
			) : null}
			<span
				style={{
					color: rowValues.strikeTvl ? 'var(--text-disabled)' : 'inherit'
				}}
			>
				{tvlValue != null ? formattedNum(tvlValue, true) : null}
			</span>
		</span>
	)
}

const listedAtColumn = columnHelper.accessor('listedAt', {
	header: 'Listed At',
	cell: ({ getValue }) => {
		const listedAt = getValue()
		return listedAt != null ? toNiceDaysAgo(listedAt) : ''
	},
	meta: {
		headerClassName: 'w-[120px]',
		align: 'end'
	}
})

const recentlyListedProtocolsColumns = [
	...protocolsColumns.slice(0, 3),
	listedAtColumn,
	...protocolsColumns.slice(3, -1)
]

const airdropsColumns = [
	...protocolsColumns.slice(0, 3),
	columnHelper.accessor('totalRaised', {
		header: 'Total Money Raised',
		cell: ({ getValue }) => {
			const totalRaised = getValue()
			return <>{totalRaised != null ? formattedNum(totalRaised, true) : ''}</>
		},
		meta: {
			headerClassName: 'w-[168px]',
			align: 'end'
		}
	}),
	listedAtColumn,
	...protocolsColumns.slice(3, -1)
]

function HideForkedProtocols() {
	const router = useRouter()

	const { hideForks } = router.query

	const toHide = !(hideForks && typeof hideForks === 'string' && hideForks === 'true')

	const hide = () => {
		void pushShallowQuery(router, { hideForks: toHide })
	}
	return <Switch label="Hide Forked Protocols" value="hideForks" checked={!toHide} onChange={hide} />
}
