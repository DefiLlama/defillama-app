import { useMemo, useState, useSyncExternalStore } from 'react'
import { SelectWithCombobox } from '~/components/SelectWithCombobox'
import { VirtualTable } from '~/components/Table/Table'
import {
	ColumnSizingState,
	ExpandedState,
	getCoreRowModel,
	getExpandedRowModel,
	getSortedRowModel,
	SortingState,
	useReactTable
} from '@tanstack/react-table'
import { Icon } from '~/components/Icon'
import { slug } from '~/utils'
import { subscribeToLocalStorage } from '~/contexts/LocalStorage'
import { emissionsColumns } from '~/components/Table/Defi/columns'
import { useRouter } from 'next/router'
import { FilterBetweenRange } from '~/components/Filters/FilterBetweenRange'

const optionsKey = 'unlockTable'
const filterStatekey = 'unlockTableFilterState'

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

	const columnsInStorage = useSyncExternalStore(
		subscribeToLocalStorage,
		() => localStorage.getItem(optionsKey) ?? defaultColumns,
		() => defaultColumns
	)

	const filterState = useSyncExternalStore(
		subscribeToLocalStorage,
		() => localStorage.getItem(filterStatekey) ?? null,
		() => null
	)

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

	const addOnlyOneOption = (newOption) => {
		const ops = Object.fromEntries(columnOptions.map((col) => [col.key, col.key === newOption ? true : false]))
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
			window.localStorage.setItem(filterStatekey, null)
			window.dispatchEvent(new Event('storage'))
		} else {
			window.localStorage.setItem(optionsKey, JSON.stringify(newOptions))
			window.localStorage.setItem(filterStatekey, newState)
			window.dispatchEvent(new Event('storage'))
		}
	}

	const selectedOptions = useMemo(() => {
		const storage = JSON.parse(columnsInStorage)
		return columnOptions.filter((c) => (storage[c.key] ? true : false)).map((c) => c.key)
	}, [columnsInStorage])

	const [sorting, setSorting] = useState<SortingState>([])
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
		onSortingChange: setSorting,
		onColumnSizingChange: setColumnSizing,
		onExpandedChange: setExpanded,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getExpandedRowModel: getExpandedRowModel()
	})

	return (
		<div className="bg-(--cards-bg) border border-[#e6e6e6] dark:border-[#222324] rounded-md">
			<div className="flex items-center justify-end gap-2 flex-wrap p-3">
				<h1 className="text-xl font-semibold mr-auto">Token Unlocks</h1>

				<button
					onClick={() => setShowOnlyWatchlist(!showOnlyWatchlist)}
					className="border border-(--form-control-border) p-[6px] px-3 bg-white dark:bg-black text-black dark:text-white rounded-md text-sm flex items-center gap-2 w-[200px] justify-center"
				>
					<Icon name="bookmark" height={16} width={16} style={{ fill: showOnlyWatchlist ? 'var(--text1)' : 'none' }} />
					{showOnlyWatchlist ? 'Show All' : 'Show Watchlist'}
				</button>

				<FilterBetweenRange
					name="Unlock Value"
					trigger={<span>Unlock Value</span>}
					onSubmit={handleUnlockValueSubmit}
					min={min ? min.toString() : ''}
					max={max ? max.toString() : ''}
					variant="third"
				/>

				<FilterBetweenRange
					name="Unlock % of Market Cap"
					trigger={<span>Unlock Perc.</span>}
					onSubmit={handleUnlockPercSubmit}
					min={minPerc ? minPerc.toString() : ''}
					max={maxPerc ? maxPerc.toString() : ''}
					variant="third"
				/>

				<SelectWithCombobox
					allValues={columnOptions}
					selectedValues={selectedOptions}
					setSelectedValues={addOption}
					selectOnlyOne={addOnlyOneOption}
					toggleAll={toggleAllOptions}
					clearAll={clearAllOptions}
					nestedMenu={false}
					label={'Columns'}
					labelType="smol"
					triggerProps={{
						className:
							'flex items-center justify-between gap-2 p-2 text-xs rounded-md cursor-pointer flex-nowrap relative border border-(--form-control-border) text-[#666] dark:text-[#919296] hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) font-medium'
					}}
				/>

				<SelectWithCombobox
					allValues={UNLOCK_TYPES.map((type) => ({ name: type.charAt(0).toUpperCase() + type.slice(1), key: type }))}
					selectedValues={selectedUnlockTypes}
					setSelectedValues={setSelectedUnlockTypes}
					selectOnlyOne={(value) => setSelectedUnlockTypes([value])}
					toggleAll={() => setSelectedUnlockTypes(UNLOCK_TYPES)}
					clearAll={() => setSelectedUnlockTypes([])}
					nestedMenu={false}
					label={'Unlock Types'}
					labelType="smol"
					triggerProps={{
						className:
							'flex items-center justify-between gap-2 p-2 text-xs rounded-md cursor-pointer flex-nowrap relative border border-(--form-control-border) text-[#666] dark:text-[#919296] hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) font-medium'
					}}
				/>

				<div className="relative w-full sm:max-w-[280px]">
					<Icon
						name="search"
						height={16}
						width={16}
						className="absolute text-(--text3) top-0 bottom-0 my-auto left-2"
					/>
					<input
						value={projectName}
						onChange={(e) => {
							setProjectName(e.target.value)
						}}
						placeholder="Search projects..."
						className="border border-(--form-control-border) w-full p-[6px] pl-7 bg-white dark:bg-black text-black dark:text-white rounded-md text-sm"
					/>
				</div>
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

// these are mising in emissionsColumns
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
