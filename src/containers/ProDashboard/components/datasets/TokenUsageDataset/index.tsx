import { useState, useMemo, useRef } from 'react'
import {
	getCoreRowModel,
	getSortedRowModel,
	getPaginationRowModel,
	getFilteredRowModel,
	useReactTable,
	SortingState,
	PaginationState
} from '@tanstack/react-table'
import { download, formattedNum } from '~/utils'
import { ProTableCSVButton } from '../../ProTable/CsvButton'
import { flexRender } from '@tanstack/react-table'
import { SortIcon } from '~/components/Table/SortIcon'
import { LoadingSpinner } from '../../LoadingSpinner'
import { useTokenUsageData } from './useTokenUsageData'
import { getColumns } from './columns'
import { ReactSelect } from '~/components/MultiSelect/ReactSelect'
import { useTokenSearch } from './useTokenSearch'
import { reactSelectStyles } from '../../../utils/reactSelectStyles'
import { components } from 'react-select'

interface TokenOption {
	value: string
	label: string
	logo?: string
}

interface TokenUsageDatasetProps {
	config: {
		id: string
		tokenSymbols?: string[]
		includeCex?: boolean
	}
	onConfigChange: (config: any) => void
	enableColumnManagement?: boolean
}

const TokenOptionComponent = ({ innerProps, label, data }: any) => (
	<div {...innerProps} className="flex items-center gap-2 p-2 cursor-pointer">
		{data.logo ? (
			<img
				src={data.logo?.replace('/0/', '')}
				alt=""
				className="w-5 h-5 rounded-full"
				onError={(e) => {
					e.currentTarget.style.display = 'none'
				}}
			/>
		) : (
			<div className="w-5 h-5 rounded-full bg-(--bg3)" />
		)}
		<span>{label}</span>
	</div>
)

const CustomValueContainer = ({ children, ...props }: any) => {
	const { getValue } = props
	const values = getValue()

	if (!values || values.length === 0) {
		return <components.ValueContainer {...props}>{children}</components.ValueContainer>
	}

	const shouldShowCount = values.length > 1

	return (
		<components.ValueContainer {...props}>
			{shouldShowCount ? (
				<div className="flex items-center gap-2">
					<span className="text-sm font-medium">{values.length} tokens selected</span>
				</div>
			) : (
				children
			)}
		</components.ValueContainer>
	)
}

export default function TokenUsageDataset({ config, onConfigChange }: TokenUsageDatasetProps) {
	const [search, setSearch] = useState('')
	const [sorting, setSorting] = useState<SortingState>([{ desc: true, id: 'amountUsd' }])
	const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 25 })
	const [tokenSearchInput, setTokenSearchInput] = useState('')

	const tokenSymbols = config.tokenSymbols || []
	const includeCex = config.includeCex ?? false

	const { data: rawData = [], isLoading, isError, refetch } = useTokenUsageData(tokenSymbols, includeCex)
	const { data: tokenOptions = [], isLoading: isLoadingTokens } = useTokenSearch(tokenSearchInput)
	const { data: defaultTokens = [] } = useTokenSearch('')

	const filteredData = useMemo(() => {
		if (!search) return rawData
		const searchLower = search.toLowerCase()
		return rawData.filter(
			(item) => item.name.toLowerCase().includes(searchLower) || item.category?.toLowerCase().includes(searchLower)
		)
	}, [rawData, search])

	const columns = useMemo(() => getColumns(tokenSymbols), [tokenSymbols])

	const table = useReactTable({
		data: filteredData,
		columns,
		state: {
			sorting,
			pagination,
			globalFilter: search
		},
		onSortingChange: setSorting,
		onPaginationChange: setPagination,
		onGlobalFilterChange: setSearch,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		getFilteredRowModel: getFilteredRowModel()
	})

	const handleTokenChange = (selectedOptions: any) => {
		const symbols = selectedOptions ? selectedOptions.map((opt: any) => opt.value) : []
		if (symbols.length > 4) {
			return
		}
		onConfigChange({
			...config,
			tokenSymbols: symbols
		})
	}

	const handleIncludeCexChange = () => {
		onConfigChange({
			...config,
			includeCex: !includeCex
		})
	}

	const tokenStats = useMemo(() => {
		if (tokenSymbols.length <= 1) return null

		const stats: Record<string, { total: number; protocols: number }> = {}
		tokenSymbols.forEach((symbol) => {
			stats[symbol] = { total: 0, protocols: 0 }
		})

		rawData.forEach((item) => {
			if (item.tokens) {
				Object.entries(item.tokens).forEach(([symbol, amount]) => {
					if (stats[symbol]) {
						stats[symbol].total += amount
						stats[symbol].protocols++
					}
				})
			}
		})

		return stats
	}, [rawData, tokenSymbols])

	const totalAmount = useMemo(() => rawData.reduce((sum, item) => sum + item.amountUsd, 0), [rawData])
	const protocolCount = rawData.length
	const categoryBreakdown = useMemo(() => {
		return rawData.reduce((acc, item) => {
			const category = item.category || 'Unknown'
			if (!acc[category]) {
				acc[category] = { count: 0, amount: 0 }
			}
			acc[category].count++
			acc[category].amount += item.amountUsd
			return acc
		}, {} as Record<string, { count: number; amount: number }>)
	}, [rawData])

	const topCategories = useMemo(() => {
		return Object.entries(categoryBreakdown)
			.sort(([, a], [, b]) => b.amount - a.amount)
			.slice(0, 3)
	}, [categoryBreakdown])

	const protocolOverlap = useMemo(() => {
		if (tokenSymbols.length <= 1) return null

		const overlap: Record<string, number> = {
			exclusive: 0,
			shared: 0
		}

		tokenSymbols.forEach((symbol) => {
			overlap[`${symbol}_only`] = 0
		})

		rawData.forEach((protocol) => {
			const usedTokens = tokenSymbols.filter((symbol) => protocol.tokens?.[symbol] && protocol.tokens[symbol] > 0)

			if (usedTokens.length === 1) {
				overlap[`${usedTokens[0]}_only`]++
				overlap.exclusive++
			} else if (usedTokens.length > 1) {
				overlap.shared++
			}
		})

		return overlap
	}, [rawData, tokenSymbols])

	const downloadCSV = () => {
		const isMultiToken = tokenSymbols.length > 1
		const headers = ['Protocol', 'Category']

		if (isMultiToken) {
			tokenSymbols.forEach((symbol) => headers.push(`${symbol.toUpperCase()} (USD)`))
		}
		headers.push('Total Amount (USD)')

		const csvData = table.getRowModel().rows.map((row) => {
			const data: any = {
				Protocol: row.original.name,
				Category: row.original.category || ''
			}

			if (isMultiToken) {
				tokenSymbols.forEach((symbol) => {
					data[`${symbol.toUpperCase()} (USD)`] = row.original.tokens?.[symbol] || 0
				})
			}

			data['Total Amount (USD)'] = row.original.amountUsd
			return data
		})

		const csv = [headers.join(','), ...csvData.map((row) => headers.map((h) => row[h]).join(','))].join('\n')

		download(`token-usage-${tokenSymbols.join('-') || 'unknown'}.csv`, csv)
	}

	if (!tokenSymbols || tokenSymbols.length === 0) {
		return (
			<div className="w-full p-4 h-full flex flex-col">
				<div className="mb-3">
					<div className="flex items-center justify-between gap-4">
						<h3 className="text-base md:text-lg font-semibold pro-text1">Token Usage Comparison</h3>
					</div>
				</div>
				<div className="flex-1 min-h-[500px] flex flex-col items-center justify-center gap-4 px-4">
					<h3 className="text-lg md:text-xl font-medium pro-text1 text-center">Select Tokens to Compare</h3>
					<div className="w-full max-w-md">
						<ReactSelect
							placeholder="Search tokens..."
							value={[]}
							onChange={handleTokenChange}
							options={tokenSearchInput ? tokenOptions : defaultTokens}
							onInputChange={(value) => setTokenSearchInput(value)}
							isLoading={isLoadingTokens}
							isClearable
							isMulti
							components={{
								Option: TokenOptionComponent,
								ValueContainer: CustomValueContainer
							}}
							styles={{
								...reactSelectStyles,
								control: (provided) => ({
									...reactSelectStyles.control(provided, {
										minHeight: '38px',
										height: '38px'
									})
								}),
								valueContainer: (provided) => ({
									...provided,
									height: '36px',
									padding: '0 8px'
								}),
								input: (provided) => ({
									...provided,
									margin: '0',
									padding: '0'
								})
							}}
							menuPortalTarget={
								typeof document !== 'undefined' ? document.querySelector('.pro-dashboard-container') : null
							}
						/>
					</div>
					<p className="text-sm text-(--text3) mt-2">Select up to 4 tokens for comparison (max 4)</p>
				</div>
			</div>
		)
	}

	if (isLoading) {
		return (
			<div className="w-full p-4 h-full flex flex-col">
				<div className="mb-3">
					<div className="flex items-center justify-between gap-4">
						<h3 className="text-base md:text-lg font-semibold pro-text1">
							{tokenSymbols.length > 0 ? `Token Usage Comparison` : 'Token Usage'}
						</h3>
					</div>
				</div>
				<div className="flex-1 min-h-[500px] flex flex-col items-center justify-center gap-4">
					<LoadingSpinner />
					<p className="text-sm pro-text2">Loading token usage data...</p>
				</div>
			</div>
		)
	}

	if (isError) {
		return (
			<div className="w-full p-4 h-full flex flex-col">
				<div className="mb-3">
					<div className="flex items-center justify-between gap-4">
						<h3 className="text-base md:text-lg font-semibold pro-text1">Token Usage Comparison</h3>
					</div>
				</div>
				<div className="flex-1 min-h-[500px] flex flex-col items-center justify-center gap-4">
					<p className="text-sm pro-text2 mb-2">Failed to load token usage data</p>
					<button
						onClick={() => refetch()}
						className="px-4 py-2 bg-(--primary1) text-white rounded-sm hover:bg-(--primary1-hover)"
					>
						Try again
					</button>
				</div>
			</div>
		)
	}

	return (
		<div className="w-full p-4 h-full flex flex-col">
			<div className="mb-3">
				<div className="flex items-center justify-between gap-4">
					<h3 className="text-base md:text-lg font-semibold pro-text1 truncate">
						Token Usage {tokenSymbols.length > 0 ? `- ${tokenSymbols.map((s) => s.toUpperCase()).join(', ')}` : ''}
					</h3>
				</div>
			</div>

			{tokenSymbols.length === 1 ? (
				<div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
					<div className="p-3 border border-(--divider)">
						<div className="text-xs text-(--text3) mb-1">Total Value</div>
						<div className="text-lg font-semibold pro-text1">{formattedNum(totalAmount, true)}</div>
					</div>
					<div className="p-3 border border-(--divider)">
						<div className="text-xs text-(--text3) mb-1">Protocols</div>
						<div className="text-lg font-semibold pro-text1">{protocolCount}</div>
					</div>
					<div className="p-3 border border-(--divider)">
						<div className="text-xs text-(--text3) mb-1">Top Category</div>
						<div className="text-lg font-semibold pro-text1">{topCategories[0] ? topCategories[0][0] : '-'}</div>
						<div className="text-xs text-(--text3)">
							{topCategories[0] ? `${topCategories[0][1].count} protocols` : ''}
						</div>
					</div>
					<div className="p-3 border border-(--divider)">
						<div className="text-xs text-(--text3) mb-1">Avg per Protocol</div>
						<div className="text-lg font-semibold pro-text1">
							{protocolCount > 0 ? formattedNum(totalAmount / protocolCount, true) : '-'}
						</div>
					</div>
				</div>
			) : (
				<>
					<div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
						{tokenSymbols.map((symbol) => (
							<div key={symbol} className="p-3 border border-(--divider)">
								<div className="text-xs text-(--text3) mb-1">{symbol.toUpperCase()} Value</div>
								<div className="text-lg font-semibold pro-text1">
									{tokenStats && tokenStats[symbol] ? formattedNum(tokenStats[symbol].total, true) : '$0'}
								</div>
								<div className="text-xs text-(--text3)">
									{tokenStats && tokenStats[symbol] ? `${tokenStats[symbol].protocols} protocols` : '0 protocols'}
								</div>
								<div className="mt-2">
									<div className="flex justify-between items-center mb-1">
										<span className="text-xs text-(--text3)">Share</span>
										<span className="text-xs font-medium">
											{tokenStats && tokenStats[symbol] && totalAmount > 0
												? `${((tokenStats[symbol].total / totalAmount) * 100).toFixed(1)}%`
												: '0%'}
										</span>
									</div>
									<div className="h-1.5 bg-(--bg2) overflow-hidden">
										<div
											className="h-full bg-(--primary1) transition-all duration-300"
											style={{
												width: `${
													tokenStats && tokenStats[symbol] && totalAmount > 0
														? (tokenStats[symbol].total / totalAmount) * 100
														: 0
												}%`
											}}
										/>
									</div>
								</div>
							</div>
						))}

						{tokenSymbols.length <= 2 && (
							<div className="p-3 border border-(--divider)">
								<div className="text-xs text-(--text3) mb-1">Total Combined</div>
								<div className="text-lg font-semibold pro-text1">{formattedNum(totalAmount, true)}</div>
								<div className="text-xs text-(--text3)">All tokens</div>
							</div>
						)}

						{tokenSymbols.length <= 3 && (
							<div className="p-3 border border-(--divider)">
								<div className="text-xs text-(--text3) mb-1">Unique Protocols</div>
								<div className="text-lg font-semibold pro-text1">{protocolCount}</div>
								<div className="text-xs text-(--text3)">
									{(() => {
										const overlap = rawData.filter((p) => p.tokens && Object.keys(p.tokens).length > 1).length
										return overlap > 0 ? `${overlap} use multiple` : 'Total count'
									})()}
								</div>
							</div>
						)}
					</div>

					{protocolOverlap && (
						<div className="p-3 border border-(--divider) mb-4">
							<div className="text-xs text-(--text3) mb-2">Protocol Distribution</div>
							<div className="flex items-center gap-4 flex-wrap">
								<div className="flex items-center gap-2">
									<div className="w-3 h-3 bg-(--primary1)" />
									<span className="text-sm">
										<span className="font-semibold">{protocolOverlap.shared}</span>
										<span className="text-(--text3)"> shared</span>
										<span className="text-xs text-(--text3)">
											{' '}
											({((protocolOverlap.shared / protocolCount) * 100).toFixed(0)}%)
										</span>
									</span>
								</div>

								{tokenSymbols.map((symbol, index) => (
									<div key={symbol} className="flex items-center gap-2">
										<div
											className="w-3 h-3 border-2 border-(--divider)"
											style={{
												backgroundColor: `hsl(${index * 90}, 50%, 50%)`,
												opacity: 0.7
											}}
										/>
										<span className="text-sm">
											<span className="font-semibold">{protocolOverlap[`${symbol}_only`] || 0}</span>
											<span className="text-(--text3)"> {symbol.toUpperCase()} only</span>
										</span>
									</div>
								))}

								<div className="ml-auto text-sm text-(--text3)">Total: {protocolCount} protocols</div>
							</div>
						</div>
					)}
				</>
			)}

			<div className="mb-3">
				<div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
					<h3 className="text-base md:text-lg font-semibold pro-text1 truncate">
						{tokenSymbols.length === 1
							? `${tokenSymbols[0].toUpperCase()} Usage`
							: `Comparing ${tokenSymbols.map((t) => t.toUpperCase()).join(', ')}`}
					</h3>
					<div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
						<div className="w-full sm:w-64 lg:w-96 order-2 sm:order-1">
							<ReactSelect
								placeholder="Add or remove tokens (max 4)..."
								value={tokenSymbols.map((symbol) => ({ label: symbol.toUpperCase(), value: symbol }))}
								onChange={handleTokenChange}
								options={tokenSearchInput ? tokenOptions : defaultTokens}
								onInputChange={(value) => setTokenSearchInput(value)}
								isLoading={isLoadingTokens}
								isClearable
								isMulti
								components={{
									Option: TokenOptionComponent,
									ValueContainer: CustomValueContainer
								}}
								styles={{
									...reactSelectStyles,
									control: (provided) => ({
										...reactSelectStyles.control(provided, {
											minHeight: '38px',
											height: '38px'
										})
									}),
									valueContainer: (provided) => ({
										...provided,
										height: '36px',
										padding: '0 8px'
									}),
									input: (provided) => ({
										...provided,
										margin: '0',
										padding: '0'
									})
								}}
							/>
						</div>
						<div className="flex items-center gap-2 sm:gap-3 order-1 sm:order-2">
							<div
								className="flex items-center gap-2 px-2 sm:px-3 h-[38px] border border-(--divider) hover:border-(--text3) transition-colors cursor-pointer text-sm"
								onClick={handleIncludeCexChange}
							>
								<div className="relative w-4 h-4">
									<input type="checkbox" checked={includeCex} readOnly className="sr-only" />
									<div
										className={`w-4 h-4 border-2 transition-all ${
											includeCex
												? 'bg-(--primary1) border-(--primary1)'
												: 'bg-transparent border-(--text3)'
										}`}
									>
										{includeCex && (
											<svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
												<path
													fillRule="evenodd"
													d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
													clipRule="evenodd"
												/>
											</svg>
										)}
									</div>
								</div>
								<span className="text-xs sm:text-sm font-medium pro-text1 whitespace-nowrap">Include CEXs</span>
							</div>
							<ProTableCSVButton
								onClick={downloadCSV}
								customClassName="flex items-center gap-2 px-3 h-[38px] text-sm border pro-border hover:bg-(--bg3) text-(--text1) transition-colors bg-(--bg1) dark:bg-[#070e0f] disabled:opacity-50 disabled:cursor-not-allowed"
							/>
						</div>
					</div>
				</div>
				<div className="flex items-center gap-2 sm:gap-4 mt-3">
					<input
						placeholder="Search protocols..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className="px-2 sm:px-3 py-1.5 text-sm border pro-border pro-bg1 pro-text1 rounded
              focus:outline-hidden focus:ring-1 focus:ring-(--primary1) w-full sm:w-auto max-w-xs"
					/>
				</div>
			</div>

			<div
				className="relative w-full flex-1 min-h-0 overflow-x-auto overflow-y-auto thin-scrollbar"
				style={{ height: '100%' }}
			>
				<table className="min-w-full text-(--text1) text-sm border-collapse">
					<thead>
						{table.getHeaderGroups().map((headerGroup) => (
							<tr key={headerGroup.id}>
								{headerGroup.headers.map((header) => (
									<th
										key={header.id}
										colSpan={header.colSpan}
										className="bg-transparent font-medium px-2 py-2 border-b border-r border-(--divider) last:border-r-0"
									>
										{header.isPlaceholder ? null : (
											<a
												style={{ display: 'flex', gap: '4px', cursor: 'pointer' }}
												onClick={() => header.column.toggleSorting()}
											>
												{flexRender(header.column.columnDef.header, header.getContext())}
												{header.column.getCanSort() && <SortIcon dir={header.column.getIsSorted()} />}
											</a>
										)}
									</th>
								))}
							</tr>
						))}
					</thead>
					<tbody>
						{table.getRowModel().rows.map((row) => (
							<tr key={row.id} className="hover:bg-(--bg3) border-b border-(--divider)">
								{row.getVisibleCells().map((cell) => (
									<td
										key={cell.id}
										className="px-2 py-2 whitespace-nowrap border-r border-(--divider) last:border-r-0"
									>
										{flexRender(cell.column.columnDef.cell, cell.getContext())}
									</td>
								))}
							</tr>
						))}
					</tbody>
				</table>
			</div>

			{table.getPageCount() > 1 && (
				<div className="flex items-center justify-between w-full mt-2 px-2 py-2">
					<div className="flex items-center gap-2">
						<button
							className="px-3 py-1 text-sm border pro-border pro-bg1 pro-text1 hover:pro-bg2 disabled:opacity-50 disabled:cursor-not-allowed"
							onClick={() => table.setPageIndex(0)}
							disabled={!table.getCanPreviousPage()}
						>
							{'<<'}
						</button>
						<button
							className="px-3 py-1 text-sm border pro-border pro-bg1 pro-text1 hover:pro-bg2 disabled:opacity-50 disabled:cursor-not-allowed"
							onClick={() => table.previousPage()}
							disabled={!table.getCanPreviousPage()}
						>
							Previous
						</button>
						<button
							className="px-3 py-1 text-sm border pro-border pro-bg1 pro-text1 hover:pro-bg2 disabled:opacity-50 disabled:cursor-not-allowed"
							onClick={() => table.nextPage()}
							disabled={!table.getCanNextPage()}
						>
							Next
						</button>
						<button
							className="px-3 py-1 text-sm border pro-border pro-bg1 pro-text1 hover:pro-bg2 disabled:opacity-50 disabled:cursor-not-allowed"
							onClick={() => table.setPageIndex(table.getPageCount() - 1)}
							disabled={!table.getCanNextPage()}
						>
							{'>>'}
						</button>
					</div>
					<span className="text-sm pro-text2">
						Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
					</span>
					<select
						value={table.getState().pagination.pageSize}
						onChange={(e) => table.setPageSize(Number(e.target.value))}
						className="px-3 py-1 text-sm border pro-border pro-bg1 pro-text1"
					>
						{[10, 25, 50, 100].map((pageSize) => (
							<option key={pageSize} value={pageSize}>
								Show {pageSize}
							</option>
						))}
					</select>
				</div>
			)}
		</div>
	)
}
