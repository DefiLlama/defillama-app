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
import { DEFI_SETTINGS_KEYS } from '~/contexts/LocalStorage'
import { useDebounce } from '~/hooks/useDebounce'
import { usePersistentColumnVisibility } from '~/hooks/usePersistentColumnVisibility'
import Layout from '~/layout'
import { chainIconUrl, slug } from '~/utils'
import { withPerformanceLogging } from '~/utils/perf'
import { descriptions } from './categories'

const excludeChains = new Set([...DEFI_SETTINGS_KEYS, 'offers', 'dcAndLsOverlap', 'excludeParent'])
const excludeCategories = new Set(['Bridge', 'Canonical Bridge'])
export const getStaticProps = withPerformanceLogging('top-protocols', async () => {
	const { protocols, chains } = await getSimpleProtocolsPageData(['name', 'extraTvl', 'chainTvls', 'category'])
	const topProtocolPerChainAndCategory = {}

	for (const p of protocols) {
		const { chainTvls, category, name } = p
		if (excludeCategories.has(category)) {
			continue
		}
		for (const chain in chainTvls) {
			if (chain.includes('-') || excludeChains.has(chain)) {
				continue
			}
			const tvl = chainTvls[chain].tvl
			topProtocolPerChainAndCategory[chain] = topProtocolPerChainAndCategory[chain] ?? {}

			const currentTopProtocol = topProtocolPerChainAndCategory[chain][category]

			if (currentTopProtocol == null || tvl > currentTopProtocol[1]) {
				topProtocolPerChainAndCategory[chain][category] = [name, tvl]
			}
		}
	}

	const data = []
	const uniqueCategories = new Set()

	for (const chain of chains) {
		const categories = topProtocolPerChainAndCategory[chain]
		const values = {}

		for (const cat in categories) {
			uniqueCategories.add(cat)
			values[cat] = categories[cat][0]
		}
		data.push({ chain, ...values })
	}

	return {
		props: {
			data,
			chains: data.map((row) => row.chain),
			uniqueCategories: Array.from(uniqueCategories)
		},
		revalidate: maxAgeForNext([22])
	}
})

const pageName = ['Top Protocols']
const optionsKey = 'top-protocols-table-columns'

export default function TopProtocols({ data, chains, uniqueCategories }) {
	const columnHelper = React.useMemo(() => createColumnHelper<any>(), [])

	const chainsSet = React.useMemo(() => new Set(chains), [chains])

	const columnOptions = React.useMemo(
		() => uniqueCategories.map((cat) => ({ name: cat, key: cat })),
		[uniqueCategories]
	)

	const {
		columnVisibility,
		clearAllColumns: clearAllPersistedColumns,
		selectAllColumns: selectAllPersistedColumns,
		selectedColumns,
		setVisibleColumns,
		setOnlyColumnVisible
	} = usePersistentColumnVisibility({
		storageKey: optionsKey,
		columnKeys: uniqueCategories
	})

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

	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
	const [searchValue, setSearchValue] = React.useState('')
	const debouncedSearch = useDebounce(searchValue, 200)

	const [selectedChains, setSelectedChains] = React.useState<string[]>(chains)

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
			const filtered = prev.filter((chain) => chainsSet.has(chain))
			return filtered.length === prev.length ? prev : filtered
		})
	}, [chainsSet])

	React.useEffect(() => {
		const column = table.getColumn('chain')
		if (!column) return

		column.setFilterValue({ search: debouncedSearch, selected: selectedChains })
	}, [debouncedSearch, selectedChains, table])

	const clearChainSelection = React.useCallback(() => {
		setSelectedChains([])
	}, [])

	const toggleAllChains = React.useCallback(() => {
		setSelectedChains((prev) => (prev.length === chains.length ? [] : (chains as string[])))
	}, [chains])

	const selectOnlyOneChain = React.useCallback((chain: string) => {
		setSelectedChains([chain])
	}, [])

	const clearAllColumns = React.useCallback(() => {
		clearAllPersistedColumns()
	}, [clearAllPersistedColumns])

	const toggleAllColumns = React.useCallback(() => {
		selectAllPersistedColumns()
	}, [selectAllPersistedColumns])

	const addColumn = React.useCallback(
		(newOptions: Array<string>) => {
			setVisibleColumns(newOptions)
		},
		[setVisibleColumns]
	)

	const addOnlyOneColumn = React.useCallback(
		(newOption: string) => {
			setOnlyColumnVisible(newOption)
		},
		[setOnlyColumnVisible]
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
							allValues={chains}
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
							allValues={columnOptions}
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
						<CSVDownloadButton prepareCsv={prepareCsv} smol />
					</div>
				</div>
				{table.getFilteredRowModel().rows.length > 0 ? (
					<VirtualTable instance={table} />
				) : (
					<p className="px-3 py-6 text-center text-(--text-primary)">No results found</p>
				)}
			</div>
		</Layout>
	)
}
