import {
	ColumnFiltersState,
	createColumnHelper,
	getCoreRowModel,
	getFilteredRowModel,
	useReactTable
} from '@tanstack/react-table'
import Router, { useRouter } from 'next/router'
import * as React from 'react'
import { maxAgeForNext } from '~/api'
import { getSimpleProtocolsPageData } from '~/api/categories/protocols'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { SelectWithCombobox } from '~/components/SelectWithCombobox'
import { VirtualTable } from '~/components/Table/Table'
import { useTableSearch } from '~/components/Table/utils'
import { TokenLogo } from '~/components/TokenLogo'
import { protocolCategories } from '~/containers/ProtocolsByCategoryOrTag/constants'
import { TVL_SETTINGS_KEYS } from '~/contexts/LocalStorage'
import Layout from '~/layout'
import { chainIconUrl, slug } from '~/utils'
import { withPerformanceLogging } from '~/utils/perf'

const excludeChains = new Set([...TVL_SETTINGS_KEYS, 'offers', 'dcAndLsOverlap', 'excludeParent'])
const excludeCategories = new Set(['Bridge', 'Canonical Bridge'])
const COLUMN_HELPER = createColumnHelper<any>()
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

const columnHelper = COLUMN_HELPER

export default function TopProtocols({ data, chains, uniqueCategories }) {
	const columnOptions = uniqueCategories.map((cat) => ({ name: cat, key: cat }))

	const router = useRouter()
	const { chain, column } = router.query
	const { selectedChains, selectedColumns, columnVisibility } = React.useMemo(() => {
		const selectedChains = chain ? (Array.isArray(chain) ? chain : chain == 'All' ? chains : [chain]) : chains
		const selectedColumns = column
			? Array.isArray(column)
				? column
				: column == 'All'
					? uniqueCategories
					: [column]
			: uniqueCategories
		const selectedColumnsSet = new Set(selectedColumns)
		const columnVisibility = {}
		for (const col of uniqueCategories) {
			columnVisibility[col] = selectedColumnsSet.has(col)
		}
		return { selectedChains, selectedColumns, columnVisibility }
	}, [chain, column, chains, uniqueCategories])

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
					headerHelperText: protocolCategories[cat as string]?.description ?? ''
				}
			})
		)

		return [...baseColumns, ...categoryColumns]
	}, [uniqueCategories])

	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])

	const table = useReactTable({
		data,
		columns,
		state: {
			columnFilters,
			columnVisibility
		},
		defaultColumn: {
			sortUndefined: 'last'
		},
		onColumnFiltersChange: setColumnFilters,
		getCoreRowModel: getCoreRowModel(),
		getFilteredRowModel: getFilteredRowModel()
	})

	const [searchValue, setSearchValue] = useTableSearch({ instance: table, columnToSearch: 'name' })

	const clearChainSelection = () => {
		const { chain: _chain, ...queries } = router.query
		Router.push(
			{
				pathname: router.pathname,
				query: { ...queries, chain: 'None' }
			},
			undefined,
			{ shallow: true }
		)
	}

	const toggleAllChains = () => {
		const { chain: _chain, ...queries } = router.query
		Router.push(
			{
				pathname: router.pathname,
				query: queries
			},
			undefined,
			{ shallow: true }
		)
	}

	const addChain = (newOptions: Array<string>) => {
		const { chain: _chain, ...queries } = router.query
		Router.push(
			{
				pathname: router.pathname,
				query: {
					...queries,
					chain: newOptions
				}
			},
			undefined,
			{ shallow: true }
		)
	}

	const selectOnlyOneChain = (chain: string) => {
		const { chain: _currentChain, ...queries } = router.query
		Router.push(
			{
				pathname: router.pathname,
				query: {
					...queries,
					chain: chain
				}
			},
			undefined,
			{ shallow: true }
		)
	}

	const clearAllColumns = () => {
		const { column: _column, ...queries } = router.query
		Router.push(
			{
				pathname: router.pathname,
				query: {
					...queries,
					column: 'None'
				}
			},
			undefined,
			{ shallow: true }
		)
	}

	const toggleAllColumns = () => {
		const { column: _column, ...queries } = router.query
		Router.push(
			{
				pathname: router.pathname,
				query: queries
			},
			undefined,
			{ shallow: true }
		)
	}

	const addColumn = (newOptions: Array<string>) => {
		const { column: _column, ...queries } = router.query
		Router.push(
			{
				pathname: router.pathname,
				query: {
					...queries,
					column: newOptions
				}
			},
			undefined,
			{ shallow: true }
		)
	}

	const addOnlyOneColumn = (newOption: string) => {
		const { column: _column, ...queries } = router.query
		Router.push(
			{
				pathname: router.pathname,
				query: {
					...queries,
					column: newOption
				}
			},
			undefined,
			{ shallow: true }
		)
	}

	const prepareCsv = () => {
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
	}

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
							className="w-full rounded-md border border-(--form-control-border) bg-white p-1 pl-7 text-black dark:bg-black dark:text-white"
						/>
					</label>

					<div className="flex items-center gap-2 max-sm:w-full max-sm:flex-col">
						<SelectWithCombobox
							allValues={chains}
							selectedValues={selectedChains}
							setSelectedValues={addChain}
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
