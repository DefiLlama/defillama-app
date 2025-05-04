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

const optionsKey = 'unlockTable'
const filterStatekey = 'unlockTableFilterState'

interface IUnlocksTableProps {
	protocols: Array<any>
	showOnlyWatchlist: boolean
	setShowOnlyWatchlist: (value: boolean) => void
	showOnlyInsider: boolean
	setShowOnlyInsider: (value: boolean) => void
	projectName: string
	setProjectName: (value: string) => void
	savedProtocols: { [key: string]: boolean }
}

export const UnlocksTable = ({
	protocols,
	showOnlyWatchlist,
	setShowOnlyWatchlist,
	showOnlyInsider,
	setShowOnlyInsider,
	projectName,
	setProjectName,
	savedProtocols
}: IUnlocksTableProps) => {
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
		const isAnyFilterActive = searchTerm || showOnlyWatchlist || showOnlyInsider

		if (!isAnyFilterActive) {
			return protocols
		}

		return protocols.filter((protocol) => {
			let shouldInclude = true

			if (searchTerm) {
				const nameMatch = protocol.name.toLowerCase().includes(searchTerm)
				const symbolMatch = protocol.tSymbol && protocol.tSymbol.toLowerCase().includes(searchTerm)
				if (!nameMatch && !symbolMatch) {
					shouldInclude = false
				}
			}

			if (shouldInclude && showOnlyWatchlist) {
				if (!savedProtocols[slug(protocol.name)]) {
					shouldInclude = false
				}
			}

			if (shouldInclude && showOnlyInsider) {
				const hasInsiderEvent = protocol.upcomingEvent?.some((event) => event.category === 'insiders')
				if (!hasInsiderEvent) {
					shouldInclude = false
				}
			}

			return shouldInclude
		})
	}, [protocols, projectName, savedProtocols, showOnlyInsider, showOnlyWatchlist])

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
		<div className="bg-[var(--cards-bg)] rounded-md">
			<div className="flex items-center justify-end gap-2 flex-wrap p-3">
				<h1 className="text-xl font-semibold mr-auto">Token Unlocks</h1>

				<button
					onClick={() => setShowOnlyWatchlist(!showOnlyWatchlist)}
					className="border border-[var(--form-control-border)] p-[6px] px-3 bg-white dark:bg-black text-black dark:text-white rounded-md text-sm flex items-center gap-2 w-[200px] justify-center"
				>
					<Icon name="bookmark" height={16} width={16} style={{ fill: showOnlyWatchlist ? 'var(--text1)' : 'none' }} />
					{showOnlyWatchlist ? 'Show All' : 'Show Watchlist'}
				</button>

				<button
					onClick={() => setShowOnlyInsider(!showOnlyInsider)}
					className="border border-[var(--form-control-border)] p-[6px] px-3 bg-white dark:bg-black text-black dark:text-white rounded-md text-sm flex items-center gap-2 w-[200px] justify-center"
				>
					<Icon name="key" height={16} width={16} style={{ fill: showOnlyInsider ? 'var(--text1)' : 'none' }} />
					{showOnlyInsider ? 'Show All' : 'Insiders Only'}
				</button>

				<div className="relative w-full sm:max-w-[280px]">
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
						placeholder="Search projects..."
						className="border border-[var(--form-control-border)] w-full p-[6px] pl-7 bg-white dark:bg-black text-black dark:text-white rounded-md text-sm"
					/>
				</div>

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
							'flex items-center justify-between gap-2 p-2 text-xs rounded-md cursor-pointer flex-nowrap relative border border-[var(--form-control-border)] text-[#666] dark:text-[#919296] hover:bg-[var(--link-hover-bg)] focus-visible:bg-[var(--link-hover-bg)] font-medium'
					}}
				/>
			</div>
			<VirtualTable instance={instance} stripedBg rowSize={70} />
		</div>
	)
}

enum TABLE_CATEGORIES {
	UNLOCKS = 'Unlocks',
	TOKENS = 'Tokens',
	TIME = 'Time'
}

const columnOptions = [
	{ name: 'Name', key: 'name' },
	{ name: 'Price', key: 'price', category: TABLE_CATEGORIES.TOKENS },
	{ name: 'Market Cap', key: 'mcap', category: TABLE_CATEGORIES.TOKENS },
	{ name: 'Token Symbol', key: 'symbol', category: TABLE_CATEGORIES.TOKENS },
	{ name: 'Next Unlock Date', key: 'nextUnlockDate', category: TABLE_CATEGORIES.TIME },
	{ name: 'Token Amount', key: 'unlockAmount', category: TABLE_CATEGORIES.UNLOCKS },
	{ name: 'Value (USD)', key: 'unlockValue', category: TABLE_CATEGORIES.UNLOCKS },
	{ name: '% of Supply', key: 'percSupply', category: TABLE_CATEGORIES.UNLOCKS }
]

const defaultColumns = JSON.stringify({
	name: true,
	price: true,
	mcap: true,
	symbol: true,
	nextUnlockDate: true,
	unlockAmount: true,
	unlockValue: true,
	percSupply: true
})
