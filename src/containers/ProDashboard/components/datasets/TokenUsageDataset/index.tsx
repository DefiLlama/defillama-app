import { useEffect, useMemo, useState } from 'react'
import {
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	PaginationState,
	SortingState,
	useReactTable
} from '@tanstack/react-table'
import { components } from 'react-select'
import { ReactSelect } from '~/components/MultiSelect/ReactSelect'
import { SortIcon } from '~/components/Table/SortIcon'
import { download, formattedNum } from '~/utils'
import { reactSelectStyles } from '../../../utils/reactSelectStyles'
import { LoadingSpinner } from '../../LoadingSpinner'
import { ProTableCSVButton } from '../../ProTable/CsvButton'
import { getColumns } from './columns'
import { useTokenSearch } from './useTokenSearch'
import { useTokenUsageData } from './useTokenUsageData'

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
	<div {...innerProps} className="flex cursor-pointer items-center gap-2 p-2">
		{data.logo ? (
			<img
				src={data.logo?.replace('/0/', '')}
				alt=""
				className="h-5 w-5 rounded-full"
				onError={(e) => {
					e.currentTarget.style.display = 'none'
				}}
			/>
		) : (
			<div className="h-5 w-5 rounded-full bg-(--bg-tertiary)" />
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
	const [localIncludeCex, setLocalIncludeCex] = useState(config.includeCex ?? false)

	const tokenSymbols = config.tokenSymbols || []

	useEffect(() => {
		setLocalIncludeCex(config.includeCex ?? false)
	}, [config.includeCex])

	const { data: rawData = [], isLoading, isError, refetch } = useTokenUsageData(tokenSymbols, localIncludeCex)
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
		setLocalIncludeCex(!localIncludeCex)
		onConfigChange({
			...config,
			includeCex: !localIncludeCex
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
		return rawData.reduce(
			(acc, item) => {
				const category = item.category || 'Unknown'
				if (!acc[category]) {
					acc[category] = { count: 0, amount: 0 }
				}
				acc[category].count++
				acc[category].amount += item.amountUsd
				return acc
			},
			{} as Record<string, { count: number; amount: number }>
		)
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
			<div className="flex h-full w-full flex-col p-4">
				<div className="mb-3">
					<div className="flex items-center justify-between gap-4">
						<h3 className="pro-text1 text-base font-semibold md:text-lg">Token Usage Comparison</h3>
					</div>
				</div>
				<div className="flex min-h-[500px] flex-1 flex-col items-center justify-center gap-4 px-4">
					<h3 className="pro-text1 text-center text-lg font-medium md:text-xl">Select Tokens to Compare</h3>
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
					<p className="mt-2 text-sm text-(--text-tertiary)">Select up to 4 tokens for comparison (max 4)</p>
				</div>
			</div>
		)
	}

	if (isLoading) {
		return (
			<div className="flex h-full w-full flex-col p-4">
				<div className="mb-3">
					<div className="flex items-center justify-between gap-4">
						<h3 className="pro-text1 text-base font-semibold md:text-lg">
							{tokenSymbols.length > 0 ? `Token Usage Comparison` : 'Token Usage'}
						</h3>
					</div>
				</div>
				<div className="flex min-h-[500px] flex-1 flex-col items-center justify-center gap-4">
					<LoadingSpinner />
					<p className="pro-text2 text-sm">Loading token usage data...</p>
				</div>
			</div>
		)
	}

	if (isError) {
		return (
			<div className="flex h-full w-full flex-col p-4">
				<div className="mb-3">
					<div className="flex items-center justify-between gap-4">
						<h3 className="pro-text1 text-base font-semibold md:text-lg">Token Usage Comparison</h3>
					</div>
				</div>
				<div className="flex min-h-[500px] flex-1 flex-col items-center justify-center gap-4">
					<p className="pro-text2 mb-2 text-sm">Failed to load token usage data</p>
					<button
						onClick={() => refetch()}
						className="rounded-sm bg-(--primary) px-4 py-2 text-white hover:bg-(--primary-hover)"
					>
						Try again
					</button>
				</div>
			</div>
		)
	}

	return (
		<div className="flex h-full w-full flex-col p-4">
			<div className="mb-3">
				<div className="flex items-center justify-between gap-4">
					<h3 className="pro-text1 truncate text-base font-semibold md:text-lg">
						Token Usage {tokenSymbols.length > 0 ? `- ${tokenSymbols.map((s) => s.toUpperCase()).join(', ')}` : ''}
					</h3>
				</div>
			</div>

			{tokenSymbols.length === 1 ? (
				<div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-4">
					<div className="border border-(--divider) p-3">
						<div className="mb-1 text-xs text-(--text-tertiary)">Total Value</div>
						<div className="pro-text1 text-lg font-semibold">{formattedNum(totalAmount, true)}</div>
					</div>
					<div className="border border-(--divider) p-3">
						<div className="mb-1 text-xs text-(--text-tertiary)">Protocols</div>
						<div className="pro-text1 text-lg font-semibold">{protocolCount}</div>
					</div>
					<div className="border border-(--divider) p-3">
						<div className="mb-1 text-xs text-(--text-tertiary)">Top Category</div>
						<div className="pro-text1 text-lg font-semibold">{topCategories[0] ? topCategories[0][0] : '-'}</div>
						<div className="text-xs text-(--text-tertiary)">
							{topCategories[0] ? `${topCategories[0][1].count} protocols` : ''}
						</div>
					</div>
					<div className="border border-(--divider) p-3">
						<div className="mb-1 text-xs text-(--text-tertiary)">Avg per Protocol</div>
						<div className="pro-text1 text-lg font-semibold">
							{protocolCount > 0 ? formattedNum(totalAmount / protocolCount, true) : '-'}
						</div>
					</div>
				</div>
			) : (
				<>
					<div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
						{tokenSymbols.map((symbol) => (
							<div key={symbol} className="border border-(--divider) p-3">
								<div className="mb-1 text-xs text-(--text-tertiary)">{symbol.toUpperCase()} Value</div>
								<div className="pro-text1 text-lg font-semibold">
									{tokenStats && tokenStats[symbol] ? formattedNum(tokenStats[symbol].total, true) : '$0'}
								</div>
								<div className="text-xs text-(--text-tertiary)">
									{tokenStats && tokenStats[symbol] ? `${tokenStats[symbol].protocols} protocols` : '0 protocols'}
								</div>
								<div className="mt-2">
									<div className="mb-1 flex items-center justify-between">
										<span className="text-xs text-(--text-tertiary)">Share</span>
										<span className="text-xs font-medium">
											{tokenStats && tokenStats[symbol] && totalAmount > 0
												? `${((tokenStats[symbol].total / totalAmount) * 100).toFixed(1)}%`
												: '0%'}
										</span>
									</div>
									<div className="h-1.5 overflow-hidden bg-(--bg-secondary)">
										<div
											className="h-full bg-(--primary) transition-all duration-300"
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
							<div className="border border-(--divider) p-3">
								<div className="mb-1 text-xs text-(--text-tertiary)">Total Combined</div>
								<div className="pro-text1 text-lg font-semibold">{formattedNum(totalAmount, true)}</div>
								<div className="text-xs text-(--text-tertiary)">All tokens</div>
							</div>
						)}

						{tokenSymbols.length <= 3 && (
							<div className="border border-(--divider) p-3">
								<div className="mb-1 text-xs text-(--text-tertiary)">Unique Protocols</div>
								<div className="pro-text1 text-lg font-semibold">{protocolCount}</div>
								<div className="text-xs text-(--text-tertiary)">
									{(() => {
										const overlap = rawData.filter((p) => p.tokens && Object.keys(p.tokens).length > 1).length
										return overlap > 0 ? `${overlap} use multiple` : 'Total count'
									})()}
								</div>
							</div>
						)}
					</div>

					{protocolOverlap && (
						<div className="mb-4 border border-(--divider) p-3">
							<div className="mb-2 text-xs text-(--text-tertiary)">Protocol Distribution</div>
							<div className="flex flex-wrap items-center gap-4">
								<div className="flex items-center gap-2">
									<div className="h-3 w-3 bg-(--primary)" />
									<span className="text-sm">
										<span className="font-semibold">{protocolOverlap.shared}</span>
										<span className="text-(--text-tertiary)"> shared</span>
										<span className="text-xs text-(--text-tertiary)">
											{' '}
											({((protocolOverlap.shared / protocolCount) * 100).toFixed(0)}%)
										</span>
									</span>
								</div>

								{tokenSymbols.map((symbol, index) => (
									<div key={symbol} className="flex items-center gap-2">
										<div
											className="h-3 w-3 border-2 border-(--divider)"
											style={{
												backgroundColor: `hsl(${index * 90}, 50%, 50%)`,
												opacity: 0.7
											}}
										/>
										<span className="text-sm">
											<span className="font-semibold">{protocolOverlap[`${symbol}_only`] || 0}</span>
											<span className="text-(--text-tertiary)"> {symbol.toUpperCase()} only</span>
										</span>
									</div>
								))}

								<div className="ml-auto text-sm text-(--text-tertiary)">Total: {protocolCount} protocols</div>
							</div>
						</div>
					)}
				</>
			)}

			<div className="mb-3">
				<div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
					<h3 className="pro-text1 truncate text-base font-semibold md:text-lg">
						{tokenSymbols.length === 1
							? `${tokenSymbols[0].toUpperCase()} Usage`
							: `Comparing ${tokenSymbols.map((t) => t.toUpperCase()).join(', ')}`}
					</h3>
					<div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-3">
						<div className="order-2 w-full sm:order-1 sm:w-64 lg:w-96">
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
						<div className="order-1 flex items-center gap-2 sm:order-2 sm:gap-3">
							<div
								className="flex h-[38px] cursor-pointer items-center gap-2 border border-(--divider) px-2 text-sm transition-colors hover:border-(--text-tertiary) sm:px-3"
								onClick={handleIncludeCexChange}
							>
								<div className="relative h-4 w-4">
									<input type="checkbox" checked={localIncludeCex} readOnly className="sr-only" />
									<div
										className={`h-4 w-4 border-2 transition-all ${
											localIncludeCex ? 'border-(--primary) bg-(--primary)' : 'border-(--text-tertiary) bg-transparent'
										}`}
									>
										{localIncludeCex && (
											<svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
												<path
													fillRule="evenodd"
													d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
													clipRule="evenodd"
												/>
											</svg>
										)}
									</div>
								</div>
								<span className="pro-text1 text-xs font-medium whitespace-nowrap sm:text-sm">Include CEXs</span>
							</div>
							<ProTableCSVButton
								onClick={downloadCSV}
								className="pro-border flex h-[38px] items-center gap-2 border bg-(--bg-main) px-3 text-sm text-(--text-primary) transition-colors hover:bg-(--bg-tertiary) disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[#070e0f]"
							/>
						</div>
					</div>
				</div>
				<div className="mt-3 flex items-center gap-2 sm:gap-4">
					<input
						placeholder="Search protocols..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className="pro-border pro-bg1 pro-text1 w-full max-w-xs rounded border px-2 py-1.5 text-sm focus:ring-1 focus:ring-(--primary) focus:outline-hidden sm:w-auto sm:px-3"
					/>
				</div>
			</div>

			<div
				className="thin-scrollbar relative min-h-0 w-full flex-1 overflow-x-auto overflow-y-auto"
				style={{ height: '100%' }}
			>
				<table className="min-w-full border-collapse text-sm text-(--text-primary)">
					<thead>
						{table.getHeaderGroups().map((headerGroup) => (
							<tr key={headerGroup.id}>
								{headerGroup.headers.map((header) => (
									<th
										key={header.id}
										colSpan={header.colSpan}
										className="border-r border-b border-(--divider) bg-transparent px-2 py-2 font-medium last:border-r-0"
									>
										{header.isPlaceholder ? null : (
											<div style={{ display: 'flex', gap: '4px' }}>
												{flexRender(header.column.columnDef.header, header.getContext())}
												{header.column.getCanSort() && (
													<SortIcon
														dir={header.column.getIsSorted()}
														onClickAsc={(e) => {
															e.stopPropagation()
															if (header.column.getIsSorted() !== 'asc') {
																header.column.toggleSorting(false)
															}
														}}
														onClickDesc={(e) => {
															e.stopPropagation()
															if (header.column.getIsSorted() !== 'desc') {
																header.column.toggleSorting(true)
															}
														}}
													/>
												)}
											</div>
										)}
									</th>
								))}
							</tr>
						))}
					</thead>
					<tbody>
						{table.getRowModel().rows.map((row) => (
							<tr key={row.id} className="border-b border-(--divider) hover:bg-(--bg-tertiary)">
								{row.getVisibleCells().map((cell) => (
									<td key={cell.id} className="border-r border-(--divider) px-2 py-2 whitespace-nowrap last:border-r-0">
										{flexRender(cell.column.columnDef.cell, cell.getContext())}
									</td>
								))}
							</tr>
						))}
					</tbody>
				</table>
			</div>

			{table.getPageCount() > 1 && (
				<div className="mt-2 flex w-full items-center justify-between px-2 py-2">
					<div className="flex items-center gap-2">
						<button
							className="pro-border pro-bg1 pro-text1 hover:pro-bg2 border px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50"
							onClick={() => table.setPageIndex(0)}
							disabled={!table.getCanPreviousPage()}
						>
							{'<<'}
						</button>
						<button
							className="pro-border pro-bg1 pro-text1 hover:pro-bg2 border px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50"
							onClick={() => table.previousPage()}
							disabled={!table.getCanPreviousPage()}
						>
							Previous
						</button>
						<button
							className="pro-border pro-bg1 pro-text1 hover:pro-bg2 border px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50"
							onClick={() => table.nextPage()}
							disabled={!table.getCanNextPage()}
						>
							Next
						</button>
						<button
							className="pro-border pro-bg1 pro-text1 hover:pro-bg2 border px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50"
							onClick={() => table.setPageIndex(table.getPageCount() - 1)}
							disabled={!table.getCanNextPage()}
						>
							{'>>'}
						</button>
					</div>
					<span className="pro-text2 text-sm">
						Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
					</span>
					<select
						value={table.getState().pagination.pageSize}
						onChange={(e) => table.setPageSize(Number(e.target.value))}
						className="pro-border pro-bg1 pro-text1 border px-3 py-1 text-sm"
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
