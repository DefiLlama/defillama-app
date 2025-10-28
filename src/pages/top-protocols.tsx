import * as React from 'react'
import {
	ColumnFiltersState,
	createColumnHelper,
	getCoreRowModel,
	getFilteredRowModel,
	useReactTable
} from '@tanstack/react-table'
import { maxAgeForNext } from '~/api'
import { getSimpleProtocolsPageData } from '~/api/categories/protocols'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { SelectWithCombobox } from '~/components/SelectWithCombobox'
import { VirtualTable } from '~/components/Table/Table'
import { TokenLogo } from '~/components/TokenLogo'
import { subscribeToLocalStorage } from '~/contexts/LocalStorage'
import Layout from '~/layout'
import { chainIconUrl, slug } from '~/utils'
import { withPerformanceLogging } from '~/utils/perf'
import { descriptions } from './categories'

export const getStaticProps = withPerformanceLogging('top-protocols', async () => {
	const { protocols, chains } = await getSimpleProtocolsPageData(['name', 'extraTvl', 'chainTvls', 'category'])
	const topProtocolPerChainAndCategory = Object.fromEntries(chains.map((c) => [c, {}]))

	protocols.forEach((p) => {
		const { chainTvls, category, name } = p
		if (['Bridge', 'Canonical Bridge'].includes(category)) {
			return
		}
		Object.entries(chainTvls ?? {}).forEach(([chain, { tvl }]: [string, { tvl: number }]) => {
			if (topProtocolPerChainAndCategory[chain] === undefined) {
				return
			}

			const currentTopProtocol = topProtocolPerChainAndCategory[chain][category]

			if (currentTopProtocol === undefined || tvl > currentTopProtocol[1]) {
				topProtocolPerChainAndCategory[chain][category] = [name, tvl]
			}
		})
	})

	const data = []
	const uniqueCategories = new Set()

	chains.forEach((chain) => {
		const categories = topProtocolPerChainAndCategory[chain]
		const values = {}

		for (const cat in categories) {
			uniqueCategories.add(cat)
			values[cat] = categories[cat][0]
		}
		data.push({ chain, ...values })
	})

	return {
		props: {
			data,
			uniqueCategories: Array.from(uniqueCategories)
		},
		revalidate: maxAgeForNext([22])
	}
})

const pageName = ['Top Protocols']
const optionsKey = 'top-protocols-table-columns'

export default function TopProtocols({ data, uniqueCategories }) {
	const columnHelper = React.useMemo(() => createColumnHelper<any>(), [])
	const chainOptions = React.useMemo(() => Array.from(new Set(data.map((row) => row.chain))), [data])

	const columnOptions = React.useMemo(
		() => uniqueCategories.map((cat) => ({ name: cat, key: cat })),
		[uniqueCategories]
	)

	const defaultColumns = React.useMemo(
		() => JSON.stringify(Object.fromEntries(columnOptions.map((col) => [col.key, true]))),
		[columnOptions]
	)

	const columns = React.useMemo(() => {
		const baseColumns = [
			columnHelper.accessor('chain', {
				header: 'Chain',
				enableSorting: false,
				filterFn: (row, id, filterValue) => {
					const value = (row.getValue(id) as string) ?? ''
					if (!filterValue || typeof filterValue !== 'object') {
						return true
					}
					const { search = '', selected = [] } = filterValue as { search?: string; selected?: string[] }
					const normalizedValue = value.toLowerCase()
					const matchesSearch = search ? normalizedValue.includes(search.toLowerCase()) : true
					const matchesSelection = Array.isArray(selected) && selected.length > 0 ? selected.includes(value) : true
					return matchesSearch && matchesSelection
				},
				cell: (info) => {
					const chain = info.getValue()
					const rowIndex = info.row.index
					return (
						<span className="flex items-center gap-2">
							<span className="shrink-0">{rowIndex + 1}</span>
							<TokenLogo logo={chainIconUrl(chain)} />
							<BasicLink
								href={`/chain/${slug(chain)}`}
								className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text) hover:underline"
							>
								{chain}
							</BasicLink>
						</span>
					)
				},
				size: 200
			})
		]

		const categoryColumns = uniqueCategories.map((cat) =>
			columnHelper.accessor(cat, {
				header: cat,
				enableSorting: false,
				cell: (info) => {
					const protocolName = info.getValue()
					return protocolName ? (
						<BasicLink href={`/protocol/${slug(protocolName)}`} className="text-sm font-medium text-(--link-text)">
							{protocolName}
						</BasicLink>
					) : null
				},
				size: 200,
				meta: {
					headerHelperText: descriptions[cat as string]
				}
			})
		)

		return [...baseColumns, ...categoryColumns]
	}, [columnHelper, uniqueCategories])

	const columnsInStorage = React.useSyncExternalStore(
		subscribeToLocalStorage,
		() => (typeof window !== 'undefined' ? (localStorage.getItem(optionsKey) ?? defaultColumns) : defaultColumns),
		() => defaultColumns
	)

	const defaultColumnVisibility = React.useMemo(() => {
		try {
			return JSON.parse(defaultColumns) as Record<string, boolean>
		} catch {
			return {}
		}
	}, [defaultColumns])

	const columnVisibility = React.useMemo(() => {
		try {
			const stored = JSON.parse(columnsInStorage) as Record<string, boolean>
			return { ...defaultColumnVisibility, ...stored, chain: true }
		} catch {
			return { ...defaultColumnVisibility, chain: true }
		}
	}, [columnsInStorage, defaultColumnVisibility])

	React.useEffect(() => {
		if (typeof window === 'undefined') return

		try {
			const stored = window.localStorage.getItem(optionsKey)
			if (stored === null) {
				window.localStorage.setItem(optionsKey, defaultColumns)
				window.dispatchEvent(new Event('storage'))
				return
			}

			const storedObj = JSON.parse(stored) as Record<string, boolean>
			const merged = { ...defaultColumnVisibility, ...storedObj }
			const sanitized = Object.fromEntries(Object.entries(merged).filter(([key]) => key !== 'chain'))
			const sanitizedString = JSON.stringify(sanitized)

			if (sanitizedString !== stored) {
				window.localStorage.setItem(optionsKey, sanitizedString)
				window.dispatchEvent(new Event('storage'))
			}
		} catch {
			window.localStorage.setItem(optionsKey, defaultColumns)
			window.dispatchEvent(new Event('storage'))
		}
	}, [defaultColumns, defaultColumnVisibility])

	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
	const [searchValue, setSearchValue] = React.useState('')
	const [debouncedSearch, setDebouncedSearch] = React.useState('')
	const [selectedChains, setSelectedChains] = React.useState<string[]>([])

	const table = useReactTable({
		data,
		columns,
		state: {
			columnFilters,
			columnVisibility
		},
		onColumnFiltersChange: setColumnFilters,
		getCoreRowModel: getCoreRowModel(),
		getFilteredRowModel: getFilteredRowModel()
	})

	React.useEffect(() => {
		setSelectedChains((prev) => {
			const filtered = prev.filter((chain) => chainOptions.includes(chain))
			return filtered.length === prev.length ? prev : filtered
		})
	}, [chainOptions])

	React.useEffect(() => {
		const timeout = setTimeout(() => {
			setDebouncedSearch(searchValue)
		}, 200)

		return () => clearTimeout(timeout)
	}, [searchValue])

	React.useEffect(() => {
		const column = table.getColumn('chain')
		if (!column) return

		column.setFilterValue({ search: debouncedSearch, selected: selectedChains })
	}, [debouncedSearch, selectedChains, table])

	const selectedColumns = React.useMemo(
		() => columnOptions.filter((col) => columnVisibility[col.key] !== false).map((col) => col.key),
		[columnOptions, columnVisibility]
	)

	const clearChainSelection = React.useCallback(() => {
		setSelectedChains([])
	}, [])

	const toggleAllChains = React.useCallback(() => {
		setSelectedChains((prev) => (prev.length === chainOptions.length ? [] : (chainOptions as string[])))
	}, [chainOptions])

	const selectOnlyOneChain = React.useCallback((chain: string) => {
		setSelectedChains([chain])
	}, [])

	const persistColumnSelection = React.useCallback((visibilityMap: Record<string, boolean>) => {
		if (typeof window === 'undefined') return
		window.localStorage.setItem(optionsKey, JSON.stringify(visibilityMap))
		window.dispatchEvent(new Event('storage'))
	}, [])

	const clearAllColumns = React.useCallback(() => {
		const visibility = Object.fromEntries(columnOptions.map((option) => [option.key, false]))
		persistColumnSelection(visibility)
	}, [columnOptions, persistColumnSelection])

	const toggleAllColumns = React.useCallback(() => {
		const visibility = Object.fromEntries(columnOptions.map((option) => [option.key, true]))
		persistColumnSelection(visibility)
	}, [columnOptions, persistColumnSelection])

	const addColumn = React.useCallback(
		(newOptions: Array<string>) => {
			const visibility = Object.fromEntries(
				columnOptions.map((option) => [option.key, newOptions.includes(option.key)])
			)
			persistColumnSelection(visibility)
		},
		[columnOptions, persistColumnSelection]
	)

	const addOnlyOneColumn = React.useCallback(
		(newOption: string) => {
			const visibility = Object.fromEntries(columnOptions.map((option) => [option.key, option.key === newOption]))
			persistColumnSelection(visibility)
		},
		[columnOptions, persistColumnSelection]
	)

	const prepareCsv = React.useCallback(() => {
		const visibleColumns = table.getAllLeafColumns().filter((col) => col.getIsVisible())
		const headers = visibleColumns.map((col) => {
			if (typeof col.columnDef.header === 'string') {
				return col.columnDef.header
			}
			return col.id
		})

		const dataRows = table.getFilteredRowModel().rows.map((row) =>
			visibleColumns.map((col) => {
				const value = row.getValue(col.id)
				return value ?? ''
			})
		)

		return { filename: 'top-protocols.csv', rows: [headers, ...dataRows] as (string | number | boolean)[][] }
	}, [table])

	return (
		<Layout
			title="Top Protocols by chain on each category - DefiLlama"
			description={`Top Protocols by chain on each category. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`top protocols, defi top protocols, top protocols by chain, top protocols by category`}
			canonicalUrl={`/top-protocols`}
			pageName={pageName}
		>
			<div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-(--cards-bg) bg-(--cards-bg) p-3">
				<h1 className="mr-auto text-xl font-semibold">Protocols with highest TVL by chain on each category</h1>
				<CSVDownloadButton prepareCsv={prepareCsv} smol />
			</div>
			<div className="isolate rounded-md border border-(--cards-border) bg-(--cards-bg)">
				<div className="flex flex-wrap items-center justify-end gap-2 p-2">
					<label className="relative mr-auto w-full sm:max-w-[280px]">
						<span className="sr-only">Search chains</span>
						<Icon
							name="search"
							height={16}
							width={16}
							className="absolute top-0 bottom-0 left-2 my-auto text-(--text-tertiary)"
						/>
						<input
							value={searchValue}
							onChange={(e) => {
								setSearchValue(e.target.value)
							}}
							placeholder="Search..."
							className="w-full rounded-md border border-(--form-control-border) bg-white p-1 pl-7 text-black max-sm:py-0.5 dark:bg-black dark:text-white"
						/>
					</label>

					<div className="flex items-center gap-2 max-sm:w-full max-sm:flex-col">
						<SelectWithCombobox
							allValues={chainOptions as string[]}
							selectedValues={selectedChains}
							setSelectedValues={setSelectedChains}
							selectOnlyOne={selectOnlyOneChain}
							toggleAll={toggleAllChains}
							clearAll={clearChainSelection}
							nestedMenu={false}
							label={'Chains'}
							labelType="smol"
							triggerProps={{
								className:
									'flex items-center justify-between gap-2 px-2 py-1.5 text-xs rounded-md cursor-pointer flex-nowrap relative border border-(--form-control-border) text-(--text-form) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) font-medium w-full sm:w-auto'
							}}
						/>

						<SelectWithCombobox
							allValues={columnOptions as string[]}
							selectedValues={selectedColumns}
							setSelectedValues={addColumn}
							selectOnlyOne={addOnlyOneColumn}
							toggleAll={toggleAllColumns}
							clearAll={clearAllColumns}
							nestedMenu={false}
							label={'Columns'}
							labelType="smol"
							triggerProps={{
								className:
									'flex items-center justify-between gap-2 px-2 py-1.5 text-xs rounded-md cursor-pointer flex-nowrap relative border border-(--form-control-border) text-(--text-form) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) font-medium w-full sm:w-auto'
							}}
						/>
					</div>
				</div>
				<VirtualTable instance={table} />
			</div>
		</Layout>
	)
}
