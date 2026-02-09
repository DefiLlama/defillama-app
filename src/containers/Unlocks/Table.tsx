import {
	ColumnSizingState,
	ExpandedState,
	getCoreRowModel,
	getExpandedRowModel,
	getSortedRowModel,
	SortingState,
	useReactTable
} from '@tanstack/react-table'
import { ColumnDef } from '@tanstack/react-table'
import { useRouter } from 'next/router'
import { startTransition, useMemo, useState, useSyncExternalStore } from 'react'
import { lazy, Suspense } from 'react'
import { Bookmark } from '~/components/Bookmark'
import { FilterBetweenRange } from '~/components/Filters/FilterBetweenRange'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { SelectWithCombobox } from '~/components/Select/SelectWithCombobox'
import { VirtualTable } from '~/components/Table/Table'
import { TokenLogo } from '~/components/TokenLogo'
import { UpcomingEvent } from '~/containers/Unlocks/UpcomingEvent'
import { getStorageItem, setStorageItem, subscribeToStorageKey } from '~/contexts/localStorageStore'
import { formattedNum, renderPercentChange, slug, tokenIconUrl } from '~/utils'

const UnconstrainedSmolLineChart = lazy(() =>
	import('~/containers/Unlocks/UnconstrainedSmolLineChart').then((m) => ({ default: m.UnconstrainedSmolLineChart }))
)

const optionsKey = 'unlockTable'
const filterStatekey = 'unlockTableFilterState'

const setColumnOptions = (newOptions: string[]) => {
	const ops: Record<string, boolean> = {}
	for (const col of columnOptions) {
		ops[col.key] = newOptions.includes(col.key)
	}
	setStorageItem(optionsKey, JSON.stringify(ops))
}

const toggleAllOptions = () => {
	setColumnOptions(columnOptions.map((col) => col.key))
}

interface IUnlocksTableProps {
	protocols: Array<any>
	showOnlyWatchlist: boolean
	setShowOnlyWatchlist: (value: boolean) => void
	projectName: string
	setProjectName: (value: string) => void
	savedProtocols: Set<string>
	minUnlockValue?: number | null
	maxUnlockValue?: number | null
}

const UNLOCK_TYPES = [
	'publicSale',
	'privateSale',
	'insiders',
	'airdrop',
	'farming',
	'noncirculating',
	'liquidity',
	'uncategorized'
]

const UNLOCK_TYPE_OPTIONS = UNLOCK_TYPES.map((type) => ({
	name: type.charAt(0).toUpperCase() + type.slice(1),
	key: type
}))

export const UnlocksTable = ({
	protocols,
	showOnlyWatchlist,
	setShowOnlyWatchlist,
	projectName,
	setProjectName,
	savedProtocols,
	minUnlockValue,
	maxUnlockValue
}: IUnlocksTableProps) => {
	const router = useRouter()

	const [selectedUnlockTypes, setSelectedUnlockTypes] = useState<string[]>(UNLOCK_TYPES)

	const {
		minUnlockValue: minUnlockValueQuery,
		maxUnlockValue: maxUnlockValueQuery,
		minUnlockPerc: minUnlockPercQuery,
		maxUnlockPerc: maxUnlockPercQuery
	} = router.query
	const min = typeof minUnlockValueQuery === 'string' && minUnlockValueQuery !== '' ? Number(minUnlockValueQuery) : ''
	const max = typeof maxUnlockValueQuery === 'string' && maxUnlockValueQuery !== '' ? Number(maxUnlockValueQuery) : ''
	const minPerc = typeof minUnlockPercQuery === 'string' && minUnlockPercQuery !== '' ? Number(minUnlockPercQuery) : ''
	const maxPerc = typeof maxUnlockPercQuery === 'string' && maxUnlockPercQuery !== '' ? Number(maxUnlockPercQuery) : ''

	const handleUnlockValueSubmit = (e) => {
		e.preventDefault()
		const form = e.target
		const minUnlockValue = form.min?.value
		const maxUnlockValue = form.max?.value
		router.push(
			{
				pathname: router.pathname,
				query: {
					...router.query,
					minUnlockValue,
					maxUnlockValue
				}
			},
			undefined,
			{ shallow: true }
		)
	}

	const handleUnlockValueClear = () => {
		const { minUnlockValue: _minUnlockValue, maxUnlockValue: _maxUnlockValue, ...restQuery } = router.query

		router.push(
			{
				pathname: router.pathname,
				query: restQuery
			},
			undefined,
			{
				shallow: true
			}
		)
	}

	const handleUnlockPercSubmit = (e) => {
		e.preventDefault()
		const form = e.target
		const minUnlockPerc = form.min?.value
		const maxUnlockPerc = form.max?.value
		router.push(
			{
				pathname: router.pathname,
				query: {
					...router.query,
					minUnlockPerc,
					maxUnlockPerc
				}
			},
			undefined,
			{ shallow: true }
		)
	}

	const handleUnlockPercClear = () => {
		const { minUnlockPerc: _minUnlockPerc, maxUnlockPerc: _maxUnlockPerc, ...restQuery } = router.query

		router.push(
			{
				pathname: router.pathname,
				query: restQuery
			},
			undefined,
			{
				shallow: true
			}
		)
	}

	const columnsInStorage = useSyncExternalStore(
		(callback) => subscribeToStorageKey(optionsKey, callback),
		() => getStorageItem(optionsKey, defaultColumns) ?? defaultColumns,
		() => defaultColumns
	)

	const _filterState = useSyncExternalStore(
		(callback) => subscribeToStorageKey(filterStatekey, callback),
		() => getStorageItem(filterStatekey, null),
		() => null
	)

	const _setFilter = (key) => (newState) => {
		const newOptions: Record<string, boolean> = {}
		for (const column of columnOptions) {
			newOptions[column.key] = ['name', 'category'].includes(column.key) ? true : column[key] === newState
		}

		if (columnsInStorage === JSON.stringify(newOptions)) {
			toggleAllOptions()
			setStorageItem(filterStatekey, 'null')
		} else {
			setStorageItem(optionsKey, JSON.stringify(newOptions))
			setStorageItem(filterStatekey, newState)
		}
	}

	const selectedOptions = useMemo(() => {
		const storage = JSON.parse(columnsInStorage)
		return columnOptions.flatMap((c) => (storage[c.key] ? [c.key] : []))
	}, [columnsInStorage])

	const [sorting, setSorting] = useState<SortingState>([{ id: 'upcomingEvent', desc: false }])
	const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({})
	const [expanded, setExpanded] = useState<ExpandedState>({})

	const filteredData = useMemo(() => {
		const searchTerm = projectName.toLowerCase().trim()
		const isAnyFilterActive =
			searchTerm ||
			showOnlyWatchlist ||
			selectedUnlockTypes.length !== UNLOCK_TYPES.length ||
			minUnlockValue !== null ||
			maxUnlockValue !== null ||
			minPerc !== '' ||
			maxPerc !== ''

		if (!isAnyFilterActive) {
			return protocols
		}

		return protocols
			.map((protocol) => {
				const filteredUpcomingEvent =
					selectedUnlockTypes.length === UNLOCK_TYPES.length
						? protocol.upcomingEvent
						: protocol.upcomingEvent?.filter((event) => event?.category && selectedUnlockTypes.includes(event.category))

				return {
					...protocol,
					upcomingEvent: filteredUpcomingEvent
				}
			})
			.filter((protocol) => {
				let shouldInclude = true

				if (searchTerm) {
					const nameMatch = protocol.name.toLowerCase().includes(searchTerm)
					const symbolMatch = protocol.tSymbol && protocol.tSymbol.toLowerCase().includes(searchTerm)
					if (!nameMatch && !symbolMatch) {
						shouldInclude = false
					}
				}

				if (shouldInclude && showOnlyWatchlist) {
					if (!savedProtocols.has(protocol.name)) {
						shouldInclude = false
					}
				}

				if (shouldInclude && selectedUnlockTypes.length !== UNLOCK_TYPES.length) {
					const hasMatchingType = protocol.upcomingEvent?.length > 0
					if (!hasMatchingType) shouldInclude = false
				}

				if (shouldInclude && (minUnlockValue !== null || maxUnlockValue !== null)) {
					const totalUnlockValue =
						protocol.upcomingEvent?.reduce((sum, event) => {
							if (
								!event ||
								event.timestamp === null ||
								!event.noOfTokens ||
								event.noOfTokens.length === 0 ||
								protocol.tPrice == null
							)
								return sum
							const totalTokens = event.noOfTokens.reduce((s, amount) => s + amount, 0)
							return sum + totalTokens * protocol.tPrice
						}, 0) ?? 0
					if (minUnlockValue !== null && totalUnlockValue < minUnlockValue) shouldInclude = false
					if (maxUnlockValue !== null && totalUnlockValue > maxUnlockValue) shouldInclude = false
				}

				if (shouldInclude && (minPerc !== '' || maxPerc !== '')) {
					const totalUnlockValue =
						protocol.upcomingEvent?.reduce((sum, event) => {
							if (
								!event ||
								event.timestamp === null ||
								!event.noOfTokens ||
								event.noOfTokens.length === 0 ||
								protocol.tPrice == null
							)
								return sum
							const totalTokens = event.noOfTokens.reduce((s, amount) => s + amount, 0)
							return sum + totalTokens * protocol.tPrice
						}, 0) ?? 0
					const mcap = protocol.mcap ?? 0
					const percToUnlockFloat = mcap > 0 ? (totalUnlockValue / mcap) * 100 : 0

					if (minPerc !== '' && percToUnlockFloat < Number(minPerc)) shouldInclude = false
					if (maxPerc !== '' && percToUnlockFloat > Number(maxPerc)) shouldInclude = false
				}

				return shouldInclude
			})
	}, [
		protocols,
		projectName,
		savedProtocols,
		showOnlyWatchlist,
		selectedUnlockTypes,
		minUnlockValue,
		maxUnlockValue,
		minPerc,
		maxPerc
	])

	const instance = useReactTable({
		data: filteredData,
		columns: emissionsColumns,
		state: {
			sorting,
			expanded,
			columnSizing,
			columnVisibility: JSON.parse(columnsInStorage)
		},
		defaultColumn: {
			sortUndefined: 'last'
		},
		onSortingChange: setSorting,
		onColumnSizingChange: setColumnSizing,
		onExpandedChange: setExpanded,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getExpandedRowModel: getExpandedRowModel()
	})

	return (
		<div className="rounded-md border border-(--cards-border) bg-(--cards-bg)">
			<div className="flex flex-wrap items-center justify-end gap-2 p-3">
				<h1 className="mr-auto text-lg font-semibold">Token Unlocks</h1>

				<button
					onClick={() => startTransition(() => setShowOnlyWatchlist(!showOnlyWatchlist))}
					className="flex items-center justify-center gap-2 rounded-md border border-(--form-control-border) px-2 py-1.5 text-xs font-medium text-(--text-form) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg)"
				>
					<Icon
						name="bookmark"
						height={16}
						width={16}
						style={{ fill: showOnlyWatchlist ? 'var(--text-primary)' : 'none' }}
					/>
					{showOnlyWatchlist ? 'Show All' : 'Show Watchlist'}
				</button>

				<FilterBetweenRange
					name="Unlock Value"
					trigger={<span>Unlock Value</span>}
					onSubmit={handleUnlockValueSubmit}
					onClear={handleUnlockValueClear}
					min={min ?? ''}
					max={max ?? ''}
					placement="bottom-start"
				/>

				<FilterBetweenRange
					name="Unlock % of Market Cap"
					trigger={<span>Unlock Perc.</span>}
					onSubmit={handleUnlockPercSubmit}
					onClear={handleUnlockPercClear}
					min={minPerc ?? ''}
					max={maxPerc ?? ''}
					placement="bottom-start"
				/>

				<SelectWithCombobox
					allValues={columnOptions}
					selectedValues={selectedOptions}
					setSelectedValues={setColumnOptions}
					nestedMenu={false}
					label={'Columns'}
					labelType="smol"
					variant="filter-responsive"
				/>

				<SelectWithCombobox
					allValues={UNLOCK_TYPE_OPTIONS}
					selectedValues={selectedUnlockTypes}
					setSelectedValues={setSelectedUnlockTypes}
					nestedMenu={false}
					label={'Unlock Types'}
					labelType="smol"
					variant="filter-responsive"
				/>

				<label className="relative w-full sm:max-w-[280px]">
					<span className="sr-only">Search projects...</span>
					<Icon
						name="search"
						height={16}
						width={16}
						className="absolute top-0 bottom-0 left-2 my-auto text-(--text-tertiary)"
					/>
					<input
						name="search"
						value={projectName}
						onChange={(e) => {
							startTransition(() => setProjectName(e.target.value))
						}}
						placeholder="Search projects..."
						className="w-full rounded-md border border-(--form-control-border) bg-white p-1 pl-7 text-black dark:bg-black dark:text-white"
					/>
				</label>
			</div>
			<VirtualTable instance={instance} stripedBg rowSize={70} />
		</div>
	)
}

const columnOptions = [
	{ name: 'Name', key: 'name' },
	{ name: 'Price', key: 'tPrice' },
	{ name: 'Market Cap', key: 'mcap' },
	{ name: 'Total Unlocked', key: 'totalLocked' },
	{ name: 'Prev. Unlock Analysis', key: 'prevUnlock' },
	{ name: '7d Post Unlock', key: 'postUnlock' },
	{ name: 'Daily Unlocks', key: 'nextEvent' },
	{ name: 'Next Event', key: 'upcomingEvent' }
]

// these are missing in emissionsColumns
// { name: 'Token Symbol', key: 'symbol' },
// { name: 'Next Unlock Date', key: 'nextUnlockDate' },
// { name: 'Token Amount', key: 'unlockAmount' },
// { name: 'Value (USD)', key: 'unlockValue' },
// { name: '% of Supply', key: 'percSupply' },

const defaultColumns = JSON.stringify({
	name: true,
	tPrice: true,
	mcap: true,
	totalLocked: true,
	prevUnlock: true,
	postUnlock: true,
	nextEvent: true,
	upcomingEvent: true
})

interface IEmission {
	name: string
	maxSupply: number
	circSupply: number
	totalLocked: number
	nextEvent: { data: string; toUnlock: number }
	token: string
	tokenPrice: { coins: { [key: string]: { price: number; symbol: string } } }
	tPrice?: number | null
	tSymbol?: string | null
	mcap: number | null
	unlocksPerDay: number | null
	historicalPrice?: [string, number][]
	lastEvent?: Array<{
		description: string
		noOfTokens: number[]
		timestamp: number
	}>
	upcomingEvent: Array<{
		description: string
		noOfTokens: number[]
		timestamp: number
	}>
}

const emissionsColumns: ColumnDef<IEmission>[] = [
	{
		header: 'Name',
		accessorKey: 'name',
		enableSorting: false,
		cell: ({ getValue }) => {
			return (
				<div className="flex h-full items-center">
					<span className="relative flex items-center gap-2 pl-6">
						<Bookmark readableName={getValue() as string} data-bookmark className="absolute -left-0.5" />
						<TokenLogo logo={tokenIconUrl(getValue())} />
						<BasicLink
							href={`/unlocks/${slug(getValue() as string)}`}
							className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text) hover:underline"
						>
							{getValue() as string}
						</BasicLink>
					</span>
				</div>
			)
		},
		size: 160
	},
	{
		header: 'Price',
		accessorKey: 'tPrice',
		accessorFn: (row) => (row.tPrice ? +row.tPrice : undefined),
		cell: ({ getValue }) => {
			return (
				<div className="flex h-full items-center justify-end">{getValue() ? '$' + (+getValue()).toFixed(2) : ''}</div>
			)
		},
		meta: {
			align: 'end'
		},
		size: 80
	},
	{
		header: 'MCap',
		accessorKey: 'mcap',
		accessorFn: (row) => (row.mcap ? +row.mcap : undefined),
		cell: ({ getValue }) => {
			if (!getValue()) return null
			return <div className="flex h-full items-center justify-end">{formattedNum(getValue(), true)}</div>
		},
		meta: {
			align: 'end'
		},
		size: 120
	},
	{
		header: 'Total Unlocked',
		id: 'totalLocked',
		accessorFn: (row) => {
			const rawPctUnlocked = row.maxSupply ? 100 - (row.totalLocked / row.maxSupply) * 100 : 0
			return Number.isFinite(rawPctUnlocked) ? Math.max(0, Math.min(100, rawPctUnlocked)) : 0
		},
		cell: ({ row }) => {
			const maxSupply = row.original.maxSupply
			const totalLocked = row.original.totalLocked
			const rawPctUnlocked = maxSupply ? 100 - (totalLocked / maxSupply) * 100 : 0
			const pctUnlocked = Number.isFinite(rawPctUnlocked) ? Math.max(0, Math.min(100, rawPctUnlocked)) : 0

			return (
				<div className="flex h-full w-full flex-col items-end justify-center gap-2 px-2">
					<span className="text-sm leading-none font-semibold text-(--link-text) tabular-nums">
						{formattedNum(pctUnlocked)}%
					</span>
					<div className="h-2 w-full rounded-full bg-(--bg-tertiary)">
						<div
							className="h-2 rounded-full bg-(--link-text)"
							style={{
								width: `${pctUnlocked}%`
							}}
						/>
					</div>
				</div>
			)
		},
		size: 140,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Prev. Unlock Analysis',
		id: 'prevUnlock',
		accessorFn: (row) => (row.historicalPrice ? row.historicalPrice : undefined),
		cell: ({ row }) => {
			const historicalPrice = row.original.historicalPrice
			if (!historicalPrice?.length) {
				return <div className="flex h-full items-center justify-end"></div>
			}
			return (
				<div className="flex h-full items-center justify-end">
					<div className="relative w-full">
						<Suspense fallback={<></>}>
							<UnconstrainedSmolLineChart
								series={historicalPrice}
								name=""
								color={
									historicalPrice[Math.floor(historicalPrice.length / 2)][1] >=
									historicalPrice[historicalPrice.length - 1][1]
										? 'red'
										: 'green'
								}
								className="h-[44px]"
								extraData={{
									lastEvent: row.original.lastEvent
								}}
							/>
						</Suspense>
					</div>
				</div>
			)
		},
		meta: {
			align: 'end',
			headerHelperText:
				"Price trend shown from 7 days before to 7 days after the most recent major unlock event. Doesn't include Non-Circulating and Farming emissions."
		},
		size: 180
	},
	{
		header: '7d Post Unlock',
		id: 'postUnlock',
		accessorFn: (row) => {
			if (!row.historicalPrice?.length || row.historicalPrice.length < 8) return undefined
			const priceAtUnlock = row.historicalPrice[7][1]
			const priceAfter7d = row.historicalPrice[row.historicalPrice.length - 1][1]
			return ((priceAfter7d - priceAtUnlock) / priceAtUnlock) * 100
		},
		cell: ({ getValue }) => {
			return (
				<div className="flex h-full items-center justify-end">{getValue() ? renderPercentChange(getValue()) : ''}</div>
			)
		},
		meta: {
			align: 'end',
			headerHelperText: 'Price change 7 days after the most recent major unlock event'
		},
		size: 140
	},
	{
		header: 'Daily Unlocks',
		id: 'nextEvent',
		accessorFn: (row) => (row.tPrice && row.unlocksPerDay ? +row.tPrice * row.unlocksPerDay : undefined),
		cell: ({ getValue, row }) => {
			if (!row.original.unlocksPerDay) return <div className="flex h-full items-center justify-end"></div>

			return (
				<div className="flex h-full items-center justify-end">
					<span className="flex flex-col gap-1">
						{getValue() ? formattedNum((getValue() as number).toFixed(2), true) : ''}
					</span>
				</div>
			)
		},
		size: 140,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Next Event',
		id: 'upcomingEvent',
		accessorFn: (row) => {
			const { timestamp } = row.upcomingEvent?.[0] || {}
			if (!timestamp || timestamp < Date.now() / 1e3) return undefined
			return timestamp
		},
		cell: ({ row }) => {
			if (!Array.isArray(row.original.upcomingEvent) || !row.original.upcomingEvent.length) return null
			const { timestamp } = row.original.upcomingEvent[0]
			if (!timestamp || timestamp < Date.now() / 1e3) return null

			return (
				<UpcomingEvent
					{...{
						noOfTokens: row.original.upcomingEvent.map((x) => x.noOfTokens),
						timestamp,
						event: row.original.upcomingEvent,
						description: row.original.upcomingEvent.map((x) => x.description),
						price: row.original.tPrice,
						symbol: row.original.tSymbol,
						mcap: row.original.mcap,
						maxSupply: row.original.maxSupply,
						row: row.original,
						name: row.original.name
					}}
				/>
			)
		},
		size: 400
	}
]
