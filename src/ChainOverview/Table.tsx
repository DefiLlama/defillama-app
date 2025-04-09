import { RowFilter } from '~/components/Filters/RowFilter'
import type { IProtocol } from './types'
import { useMemo, useState, useSyncExternalStore } from 'react'
import { SelectWithCombobox } from '~/components/SelectWithCombobox'
import { TVLRange } from '~/components/Filters/protocols/TVLRange'
import { VirtualTable } from '~/components/Table/Table'
import {
	type ColumnDef,
	type ColumnSizingState,
	createColumnHelper,
	type ExpandedState,
	getCoreRowModel,
	getExpandedRowModel,
	getSortedRowModel,
	type SortingState,
	useReactTable
} from '@tanstack/react-table'
import { TokenLogo } from '~/components/TokenLogo'
import { Bookmark } from '~/components/Bookmark'
import { Icon } from '~/components/Icon'
import { CustomLink } from '~/components/Link'
import { ICONS_CDN, removedCategories } from '~/constants'
import { Tooltip } from '~/components/Tooltip'
import { formattedNum, formattedPercent } from '~/utils'
import { useDefiManager } from '~/contexts/LocalStorage'
import { QuestionHelper } from '~/components/QuestionHelper'

const optionsKey = 'protocolsTableColumns'

export const ChainProtocolsTable = ({ protocols }: { protocols: Array<IProtocol> }) => {
	const columnsInStorage = useSyncExternalStore(
		subscribe,
		() => localStorage.getItem(optionsKey) ?? defaultColumns,
		() => defaultColumns
	)

	const [filterState, setFilterState] = useState(null)

	const clearAllOptions = () => {
		const ops = JSON.stringify(Object.fromEntries(columnOptions.map((option) => [option.key, false])))
		window.localStorage.setItem(optionsKey, ops)
		window.dispatchEvent(new Event('storage'))
	}
	const toggleAllOptions = () => {
		const ops = JSON.stringify(Object.fromEntries(columnOptions.map((option) => [option.key, true])))
		window.localStorage.setItem(optionsKey, ops)
		window.dispatchEvent(new Event('storage'))
	}

	const addOption = (newOptions) => {
		const ops = Object.fromEntries(columnOptions.map((col) => [col.key, newOptions.includes(col.key) ? true : false]))
		window.localStorage.setItem(optionsKey, JSON.stringify(ops))
		window.dispatchEvent(new Event('storage'))
	}

	const setFilter = (key) => (newState) => {
		const newOptions = Object.fromEntries(
			columnOptions.map((column) => [
				[column.key],
				['name', 'category'].includes(column.key) ? true : column[key] === newState
			])
		)

		if (columnsInStorage === JSON.stringify(newOptions)) {
			toggleAllOptions()
			setFilterState(null)
		} else {
			window.localStorage.setItem(optionsKey, JSON.stringify(newOptions))
			window.dispatchEvent(new Event('storage'))
			setFilterState(newState)
		}
	}

	const selectedOptions = useMemo(() => {
		const storage = JSON.parse(columnsInStorage)
		return columnOptions.filter((c) => (storage[c.key] ? true : false)).map((c) => c.key)
	}, [columnsInStorage])

	const [sorting, setSorting] = useState<SortingState>([{ desc: true, id: 'tvl' }])
	const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({})
	const [expanded, setExpanded] = useState<ExpandedState>({})

	const instance = useReactTable({
		data: protocols,
		columns: columns,
		state: {
			sorting,
			expanded,
			columnSizing,
			columnVisibility: JSON.parse(columnsInStorage)
		},
		sortingFns: {
			alphanumericFalsyLast: (rowA, rowB, columnId) => {
				const desc = sorting.length ? sorting[0].desc : true

				let a = (rowA.getValue(columnId) ?? null) as any
				let b = (rowB.getValue(columnId) ?? null) as any

				/**
				 * These first 3 conditions keep our null values at the bottom.
				 */
				if (a === null && b !== null) {
					return desc ? -1 : 1
				}

				if (a !== null && b === null) {
					return desc ? 1 : -1
				}

				if (a === null && b === null) {
					return 0
				}

				// at this point, you have non-null values and you should do whatever is required to sort those values correctly
				return a - b
			}
		},
		filterFromLeafRows: true,
		onExpandedChange: setExpanded,
		getSubRows: (row: IProtocol) => row.childProtocols,
		onSortingChange: (updater) => {
			setSorting((old) => {
				const newSorting = updater instanceof Function ? updater(old) : updater

				if (newSorting.length === 0 && old.length === 1) {
					const currentDesc = old[0].desc
					if (currentDesc === undefined) {
						return [{ ...old[0], desc: false }]
					} else if (currentDesc === false) {
						return [{ ...old[0], desc: true }]
					} else {
						return [{ ...old[0], desc: undefined }]
					}
				}

				return newSorting
			})
		},
		onColumnSizingChange: setColumnSizing,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getExpandedRowModel: getExpandedRowModel()
	})

	return (
		<>
			<div className="flex items-center justify-between flex-wrap gap-2">
				<h3 className="text-lg font-medium mr-auto">Protocol Rankings</h3>
				<RowFilter
					setValue={setFilter('category')}
					selectedValue={filterState}
					values={Object.values(TABLE_CATEGORIES) as Array<string>}
				/>
				<RowFilter
					setValue={setFilter('period')}
					selectedValue={filterState}
					values={Object.values(TABLE_PERIODS) as Array<string>}
				/>
				<SelectWithCombobox
					allValues={columnOptions}
					selectedValues={selectedOptions}
					setSelectedValues={addOption}
					toggleAll={toggleAllOptions}
					clearAll={clearAllOptions}
					nestedMenu={false}
					label={'Columns'}
					labelType="smol"
					triggerProps={{
						className:
							'bg-[var(--btn2-bg)]  hover:bg-[var(--btn2-hover-bg)] focus-visible:bg-[var(--btn2-hover-bg)] flex items-center justify-between gap-2 py-2 px-3 rounded-lg cursor-pointer text-[var(--text1)] flex-nowrap relative'
					}}
				/>
				<TVLRange />
			</div>
			<VirtualTable instance={instance} />
		</>
	)
}

enum TABLE_CATEGORIES {
	FEES = 'Fees',
	REVENUE = 'Revenue',
	VOLUME = 'Volume',
	TVL = 'TVL'
}

enum TABLE_PERIODS {
	ONE_DAY = '1d',
	SEVEN_DAYS = '7d',
	ONE_MONTH = '1m'
}

const columnOptions = [
	{ name: 'Name', key: 'name' },
	{ name: 'Category', key: 'category' },
	{ name: 'TVL', key: 'tvl', category: TABLE_CATEGORIES.TVL },
	{ name: 'TVL 1d change', key: 'change_1d', category: TABLE_CATEGORIES.TVL, period: TABLE_PERIODS.ONE_DAY },
	{ name: 'TVL 7d change', key: 'change_7d', category: TABLE_CATEGORIES.TVL, period: TABLE_PERIODS.SEVEN_DAYS },
	{ name: 'TVL 1m change', key: 'change_1m', category: TABLE_CATEGORIES.TVL, period: TABLE_PERIODS.ONE_MONTH },
	{ name: 'Mcap/TVL', key: 'mcaptvl', category: TABLE_CATEGORIES.TVL },
	{ name: 'Fees 24h', key: 'fees_24h', category: TABLE_CATEGORIES.FEES, period: TABLE_PERIODS.ONE_DAY },
	{ name: 'Fees 7d', key: 'fees_7d', category: TABLE_CATEGORIES.FEES, period: TABLE_PERIODS.SEVEN_DAYS },
	{ name: 'Fees 30d', key: 'fees_30d', category: TABLE_CATEGORIES.FEES, period: TABLE_PERIODS.ONE_MONTH },
	{
		name: 'Monthly Avg 1Y Fees',
		key: 'fees_1y',
		category: TABLE_CATEGORIES.FEES
	},
	{ name: 'Revenue 24h', key: 'revenue_24h', category: TABLE_CATEGORIES.REVENUE, period: TABLE_PERIODS.ONE_DAY },
	{ name: 'Revenue 7d', key: 'revenue_7d', category: TABLE_CATEGORIES.REVENUE, period: TABLE_PERIODS.SEVEN_DAYS },
	{ name: 'Revenue 30d', key: 'revenue_30d', category: TABLE_CATEGORIES.REVENUE, period: TABLE_PERIODS.ONE_MONTH },
	{ name: 'Revenue 1y', key: 'revenue_1y', category: TABLE_CATEGORIES.REVENUE },
	{
		name: 'Monthly Avg 1Y Rev',
		key: 'average_revenue_1y',
		category: TABLE_CATEGORIES.REVENUE
	},
	{ name: 'User Fees 24h', key: 'userFees_24h', category: TABLE_CATEGORIES.FEES, period: TABLE_PERIODS.ONE_DAY },
	{ name: 'Cumulative Fees', key: 'cumulativeFees', category: TABLE_CATEGORIES.FEES },
	{
		name: 'Holders Revenue 24h',
		key: 'holderRevenue_24h',
		category: TABLE_CATEGORIES.REVENUE,
		period: TABLE_PERIODS.ONE_DAY
	},
	{
		name: 'Holders Revenue 30d',
		key: 'holdersRevenue30d',
		category: TABLE_CATEGORIES.REVENUE,
		period: TABLE_PERIODS.ONE_MONTH
	},
	{
		name: 'Treasury Revenue 24h',
		key: 'treasuryRevenue_24h',
		category: TABLE_CATEGORIES.REVENUE,
		period: TABLE_PERIODS.ONE_DAY
	},
	{
		name: 'Supply Side Revenue 24h',
		key: 'supplySideRevenue_24h',
		category: TABLE_CATEGORIES.REVENUE,
		period: TABLE_PERIODS.ONE_DAY
	},
	{ name: 'P/S', key: 'ps', category: TABLE_CATEGORIES.FEES },
	{ name: 'P/F', key: 'pf', category: TABLE_CATEGORIES.FEES },
	{ name: 'Spot Volume 24h', key: 'volume_24h', category: TABLE_CATEGORIES.VOLUME, period: TABLE_PERIODS.ONE_DAY },
	{ name: 'Spot Volume 7d', key: 'volume_7d', category: TABLE_CATEGORIES.VOLUME, period: TABLE_PERIODS.SEVEN_DAYS },
	{
		name: 'Spot Volume Change 7d',
		key: 'volumeChange_7d',
		category: TABLE_CATEGORIES.VOLUME,
		period: TABLE_PERIODS.SEVEN_DAYS
	},
	{ name: 'Spot Cumulative Volume', key: 'cumulativeVolume', category: TABLE_CATEGORIES.VOLUME }
]

const columnHelper = createColumnHelper<IProtocol>()

const columns: ColumnDef<IProtocol>[] = [
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
						<span key={`/protocol/${row.original.slug}` + chain}>{chain}</span>
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
					) : (
						<Bookmark readableProtocolName={value} data-lgonly data-bookmark />
					)}

					<span className="flex-shrink-0">{index + 1}</span>

					<TokenLogo logo={`${ICONS_CDN}/protocols/${row.original.slug}`} data-lgonly />

					<span className="flex flex-col -my-2">
						<CustomLink
							href={`/protocol/${row.original.slug}`}
							className="overflow-hidden whitespace-nowrap text-ellipsis hover:underline"
						>
							{value}
						</CustomLink>

						<Tooltip content={<Chains />} className="text-[0.7rem]">
							{`${row.original.chains.length} chain${row.original.chains.length > 1 ? 's' : ''}`}
						</Tooltip>
					</span>
					{value === 'SyncDEX Finance' && (
						<Tooltip content={'Many users have reported issues with this protocol'}>
							<Icon name="alert-triangle" height={14} width={14} />
						</Tooltip>
					)}
				</span>
			)
		},
		size: 240
	},
	{
		id: 'category',
		header: 'Category',
		accessorKey: 'category',
		enableSorting: false,
		cell: ({ getValue }) =>
			getValue() ? <CustomLink href={`/protocols/${getValue()}`}>{getValue() as string | null}</CustomLink> : '',
		size: 140,
		meta: {
			align: 'end'
		}
	},
	columnHelper.group({
		id: 'tvl',
		header: 'TVL',
		columns: [
			columnHelper.accessor((row) => row.tvl?.default?.tvl, {
				header: 'TVL',
				cell: ({ row }) =>
					row.original.strikeTvl || row.original.tvl.excludeParent ? (
						<Tvl rowValues={row.original} />
					) : (
						`${row.original.tvl != null ? `$${formattedNum(row.original.tvl.default.tvl || 0)}` : null}`
					),
				sortUndefined: 'last',
				meta: {
					align: 'end',
					headerHelperText: 'Value of all coins held in smart contracts of the protocol'
				},
				size: 120
			}),
			columnHelper.accessor((row) => row.tvlChange?.change1d, {
				header: '1d Change',
				cell: ({ getValue }) => <>{formattedPercent(getValue())}</>,
				sortUndefined: 'last',
				meta: {
					align: 'end',
					headerHelperText: 'Change in TVL in the last 24 hours'
				},
				size: 110
			}),
			columnHelper.accessor((row) => row.tvlChange?.change7d, {
				header: '7d Change',
				cell: ({ getValue }) => <>{formattedPercent(getValue())}</>,
				sortUndefined: 'last',
				meta: {
					align: 'end',
					headerHelperText: 'Change in TVL in the last 7 days'
				},
				size: 110
			}),
			columnHelper.accessor((row) => row.tvlChange?.change1m, {
				header: '1m Change',
				cell: ({ getValue }) => <>{formattedPercent(getValue())}</>,
				sortUndefined: 'last',
				meta: {
					align: 'end',
					headerHelperText: 'Change in TVL in the last 30 days'
				},
				size: 110
			}),
			columnHelper.accessor('mcaptvl', {
				header: 'Mcap/TVL',
				cell: (info) => {
					return <>{info.getValue() ?? null}</>
				},
				sortUndefined: 'last',
				size: 110,
				meta: {
					align: 'end',
					headerHelperText: 'Market cap / TVL ratio'
				}
			})
		],
		meta: { headerHelperText: 'Value of all coins held in smart contracts of the protocol' }
	}),
	columnHelper.group({
		id: 'fees',
		header: 'Fees & Revenue',
		columns: [
			columnHelper.accessor((row) => row.fees?.total24h, {
				header: 'Fees 24h',
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				sortUndefined: 'last',
				meta: {
					align: 'end',
					headerHelperText: 'Fees paid by users in the last 24 hours'
				},
				size: 100
			}),
			columnHelper.accessor((row) => row.revenue?.total24h, {
				header: 'Revenue 24h',
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				sortUndefined: 'last',
				meta: {
					align: 'end',
					headerHelperText: 'Revenue earned by the protocol in the last 24 hours'
				},
				size: 125
			}),
			columnHelper.accessor((row) => row.fees?.total7d, {
				header: 'Fees 7d',
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				sortUndefined: 'last',
				meta: {
					align: 'end',
					headerHelperText: 'Fees paid by users in the last 7 days'
				},
				size: 100
			}),
			columnHelper.accessor((row) => row.revenue?.total7d, {
				header: 'Revenue 7d',
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				sortUndefined: 'last',
				meta: {
					align: 'end',
					headerHelperText: 'Revenue earned by the protocol in the last 7 days'
				},
				size: 120
			}),
			columnHelper.accessor((row) => row.fees?.total30d, {
				header: 'Fees 30d',
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				sortUndefined: 'last',
				meta: {
					align: 'end',
					headerHelperText: 'Fees paid by users in the last 30 days'
				},
				size: 100
			}),
			columnHelper.accessor((row) => row.revenue?.total30d, {
				header: 'Revenue 30d',
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				sortUndefined: 'last',
				meta: {
					align: 'end',
					headerHelperText: 'Revenue earned by the protocol in the last 30 days'
				},
				size: 125
			}),
			columnHelper.accessor((row) => row.fees?.total1y, {
				header: 'Fees 1Y',
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				sortUndefined: 'last',
				meta: {
					align: 'end',
					headerHelperText: 'Fees paid by users in the last 1 year'
				},
				size: 170
			}),
			columnHelper.accessor((row) => row.fees?.average1y, {
				header: 'Monthly Avg 1Y Fees',
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				sortUndefined: 'last',
				meta: {
					align: 'end',
					headerHelperText: 'Average monthly fees paid by users in the last 12 months'
				},
				size: 170
			}),
			columnHelper.accessor((row) => row.revenue?.total1y, {
				header: 'Revenue 1Y',
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				sortUndefined: 'last',
				meta: {
					align: 'end',
					headerHelperText: 'Average monthly revenue earned by the protocol in the last 12 months'
				},
				size: 120
			}),
			columnHelper.accessor((row) => row.revenue?.average1y, {
				header: 'Monthly Avg 1Y Rev',
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				sortUndefined: 'last',
				meta: {
					align: 'end',
					headerHelperText: 'Average monthly revenue earned by the protocol in the last 12 months'
				},
				size: 180
			}),
			columnHelper.accessor((row) => row.fees?.totalAllTime, {
				header: 'Cumulative Fees',
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				sortUndefined: 'last',
				meta: {
					align: 'end',
					headerHelperText: 'Total fees paid by users since the protocol was launched'
				},
				size: 150
			}),
			columnHelper.accessor((row) => row.fees?.pf, {
				header: 'P/F',
				cell: (info) => <>{info.getValue() != null ? info.getValue() + 'x' : null}</>,
				sortUndefined: 'last',
				meta: {
					align: 'end',
					headerHelperText: 'Market cap / annualized fees'
				},
				size: 180
			}),
			columnHelper.accessor((row) => row.revenue?.ps, {
				header: 'P/S',
				cell: (info) => <>{info.getValue() != null ? info.getValue() + 'x' : null}</>,
				sortUndefined: 'last',
				meta: {
					align: 'end',
					headerHelperText: 'Market cap / annualized revenue'
				},
				size: 180
			})
		],
		meta: {
			headerHelperText:
				"Total fees paid by users when using the protocol\n\nRevenue is subset of fees that the protocol collects for itself, usually going to the protocol treasury, the team or distributed among token holders. This doesn't include any fees distributed to Liquidity Providers."
		}
	})
	// columnHelper.group({
	// 	id: 'volume',
	// 	header: 'Volume',
	// 	columns: [
	// 		columnHelper.accessor('volume_24h', {
	// 			header: 'Spot Volume 24h',
	// 			cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
	// 			sortUndefined: 'last',
	// 			meta: {
	// 				align: 'end',
	// 				headerHelperText: 'Volume of spot trades in the last 24 hours'
	// 			},
	// 			size: 150
	// 		}),
	// 		columnHelper.accessor('volume_7d', {
	// 			header: 'Spot Volume 7d',
	// 			cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
	// 			sortUndefined: 'last',
	// 			meta: {
	// 				align: 'end',
	// 				headerHelperText: 'Volume of spot trades in the last 7 days'
	// 			},
	// 			size: 150
	// 		}),
	// 		columnHelper.accessor('volumeChange_7d', {
	// 			header: 'Spot Change 7d',
	// 			cell: ({ getValue }) => <>{getValue() || getValue() === 0 ? formattedPercent(getValue()) : null}</>,
	// 			sortUndefined: 'last',
	// 			meta: {
	// 				align: 'end',
	// 				headerHelperText: 'Change of last 7d volume over the previous 7d volume'
	// 			},
	// 			size: 140
	// 		}),
	// 		columnHelper.accessor('cumulativeVolume', {
	// 			header: 'Spot Cumulative Volume',
	// 			cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
	// 			sortUndefined: 'last',
	// 			meta: {
	// 				align: 'end',
	// 				headerHelperText: 'Total volume traded on the protocol since it was launched'
	// 			},
	// 			size: 200
	// 		})
	// 	],
	// 	meta: {
	// 		headerHelperText: 'Volume traded on the protocol'
	// 	}
	// })
]
const defaultColumns = JSON.stringify({
	name: true,
	category: true,
	tvl: true,
	change_1d: true,
	change_7d: true,
	change_1m: true,
	mcaptvl: false,
	fees_24h: true,
	revenue_24h: true,
	fees_7d: false,
	revenue_7d: false,
	fees_30d: false,
	revenue_30d: false,
	holdersRevenue30d: false,
	fees_1y: false,
	revenue_1y: false,
	average_revenue_1y: false,
	userFees_24h: false,
	cumulativeFees: false,
	holderRevenue_24h: false,
	treasuryRevenue_24h: false,
	supplySideRevenue_24h: false,
	pf: false,
	ps: false,
	volume_24h: true,
	volume_7d: false,
	volumeChange_7d: false,
	cumulativeVolume: false
})

function subscribe(callback: () => void) {
	window.addEventListener('storage', callback)

	return () => {
		window.removeEventListener('storage', callback)
	}
}

const Tvl = ({ rowValues }) => {
	const [extraTvlsEnabled] = useDefiManager()

	let text = null

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

		removedCategories.forEach((removedCategory) => {
			if (rowValues.category === removedCategory) {
				text = `${removedCategory} protocols are not counted into Chain TVL`
			}
		})

		if (text && rowValues.childProtocols) {
			text = 'Some subprotocols are excluded from chain tvl'
		}
	}

	return (
		<span className="flex items-center justify-end gap-1">
			{text ? <QuestionHelper text={text} /> : null}
			{rowValues.tvl.excludeParent && rowValues.childProtocols ? (
				<QuestionHelper
					text={"There's some internal doublecounting that is excluded from parent TVL, so sum won't match"}
				/>
			) : null}
			<span
				style={{
					color: rowValues.strikeTvl ? 'var(--text-disabled)' : 'inherit'
				}}
			>
				{formattedNum(rowValues.tvl.default.tvl, true)}
			</span>
		</span>
	)
}
