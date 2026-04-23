import { useMutation } from '@tanstack/react-query'
import {
	createColumnHelper,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	type SortingState,
	useReactTable
} from '@tanstack/react-table'
import * as React from 'react'
import { useBlockExplorers } from '~/api/client'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { LoadingDots } from '~/components/Loaders'
import { SelectWithCombobox } from '~/components/Select/SelectWithCombobox'
import { VirtualTable } from '~/components/Table/Table'
import { TokenLogo } from '~/components/TokenLogo'
import { useDateRangeValidation } from '~/hooks/useDateRangeValidation'
import { formattedNum, slug, toNiceDayAndHour } from '~/utils'
import { getBlockExplorerNew } from '~/utils/blockExplorers'
import { fetchBridgeTransactionsClient } from './api'
import type { RawBridgeInfo } from './api.types'

type BridgeTransaction = {
	tx_hash: string
	ts: string
	tx_block: string | number
	tx_from: string
	tx_to: string
	token: string
	amount: string
	is_deposit: boolean
	chain: string
	bridge_name: string
	usd_value: string | null
}

const MAX_ITERATIONS = 50

interface TransformedTransaction {
	timestamp: number
	bridge_name: string
	bridge_slug: string
	chain: string
	is_deposit: boolean
	token: string
	amount: string
	usd_value: number | null
	tx_from: string
	tx_to: string
	tx_hash: string
}

const columnHelper = createColumnHelper<TransformedTransaction>()

const truncateMiddle = (value: string, lead = 6, tail = 4) => {
	if (!value) return ''
	if (value.length <= lead + tail + 1) return value
	return `${value.slice(0, lead)}…${value.slice(-tail)}`
}

const buildBridgeColumns = (blockExplorersData: ReturnType<typeof useBlockExplorers>['data']) => [
	columnHelper.accessor('timestamp', {
		header: 'Timestamp',
		cell: ({ getValue }) => (
			<span className="whitespace-nowrap text-(--text-secondary)">{toNiceDayAndHour(getValue())}</span>
		),
		size: 160
	}),
	columnHelper.accessor('bridge_name', {
		header: 'Bridge',
		cell: ({ row }) => (
			<BasicLink
				href={`/bridge/${row.original.bridge_slug}`}
				className="font-medium text-(--link-text) hover:underline"
			>
				{row.original.bridge_name}
			</BasicLink>
		),
		size: 160
	}),
	columnHelper.accessor('chain', {
		header: 'Chain',
		cell: ({ getValue }) => (
			<span className="inline-flex items-center gap-1.5">
				<TokenLogo name={getValue()} kind="chain" size={16} />
				<span>{getValue()}</span>
			</span>
		),
		size: 140
	}),
	columnHelper.accessor('is_deposit', {
		header: 'Direction',
		cell: ({ getValue }) => {
			const deposit = getValue()
			return (
				<span
					className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
						deposit ? 'bg-(--success)/10 text-(--success)' : 'bg-(--error)/10 text-(--error)'
					}`}
				>
					<Icon name={deposit ? 'arrow-down' : 'arrow-up-right'} height={12} width={12} />
					{deposit ? 'Deposit' : 'Withdrawal'}
				</span>
			)
		},
		size: 130
	}),
	columnHelper.accessor('token', {
		header: 'Token',
		cell: ({ getValue, row }) => {
			const value = getValue() ?? ''
			if (!value) return <span className="text-(--text-tertiary)">—</span>

			const looksLikeAddress = /^0x[0-9a-fA-F]{4,}$/.test(value) || value.includes(':')
			const explorer = looksLikeAddress
				? getBlockExplorerNew({
						apiResponse: blockExplorersData ?? [],
						address: value,
						chainName: row.original.chain,
						urlType: 'token'
					})
				: null

			if (!explorer) {
				return (
					<span className="font-mono text-xs text-(--text-secondary)" title={value}>
						{truncateMiddle(value, 8, 4)}
					</span>
				)
			}
			return (
				<a
					href={explorer.url}
					target="_blank"
					rel="noopener noreferrer"
					className="inline-flex items-center gap-1 font-mono text-xs text-(--link-text) hover:underline"
					title={value}
				>
					{truncateMiddle(value, 8, 4)}
					<Icon name="external-link" height={10} width={10} />
				</a>
			)
		},
		size: 140
	}),
	columnHelper.accessor('amount', {
		header: 'Amount',
		cell: ({ getValue }) => (
			<span className="block max-w-[120px] truncate text-right tabular-nums" title={getValue()}>
				{getValue()}
			</span>
		),
		size: 120,
		meta: { align: 'end' as const }
	}),
	columnHelper.accessor('usd_value', {
		header: 'USD Value',
		cell: ({ getValue }) => {
			const value = getValue()
			if (value == null) return <span className="text-(--text-tertiary)">—</span>
			return <span className="font-medium tabular-nums">{formattedNum(value, true)}</span>
		},
		size: 130,
		meta: { align: 'end' as const }
	}),
	columnHelper.accessor('tx_from', {
		header: 'From',
		cell: ({ getValue, row }) => {
			const value = getValue()
			if (!value) return <span className="text-(--text-tertiary)">—</span>
			const explorer = getBlockExplorerNew({
				apiResponse: blockExplorersData ?? [],
				address: value,
				chainName: row.original.chain,
				urlType: 'address'
			})
			const display = <span className="font-mono text-xs">{truncateMiddle(value)}</span>
			if (!explorer) return display
			return (
				<a
					href={explorer.url}
					target="_blank"
					rel="noopener noreferrer"
					className="inline-flex items-center gap-1 text-(--link-text) hover:underline"
					title={value}
				>
					{display}
					<Icon name="external-link" height={10} width={10} />
				</a>
			)
		},
		size: 160
	}),
	columnHelper.accessor('tx_to', {
		header: 'To',
		cell: ({ getValue, row }) => {
			const value = getValue()
			if (!value) return <span className="text-(--text-tertiary)">—</span>
			const explorer = getBlockExplorerNew({
				apiResponse: blockExplorersData ?? [],
				address: value,
				chainName: row.original.chain,
				urlType: 'address'
			})
			const display = <span className="font-mono text-xs">{truncateMiddle(value)}</span>
			if (!explorer) return display
			return (
				<a
					href={explorer.url}
					target="_blank"
					rel="noopener noreferrer"
					className="inline-flex items-center gap-1 text-(--link-text) hover:underline"
					title={value}
				>
					{display}
					<Icon name="external-link" height={10} width={10} />
				</a>
			)
		},
		size: 160
	}),
	columnHelper.accessor('tx_hash', {
		header: 'Transaction',
		cell: ({ getValue, row }) => {
			const value = getValue()
			if (!value) return <span className="text-(--text-tertiary)">—</span>
			const explorer = getBlockExplorerNew({
				apiResponse: blockExplorersData ?? [],
				address: value,
				chainName: row.original.chain,
				urlType: 'tx'
			})
			if (!explorer) {
				return (
					<span className="font-mono text-xs" title={value}>
						{truncateMiddle(value)}
					</span>
				)
			}
			return (
				<a
					href={explorer.url}
					target="_blank"
					rel="noopener noreferrer"
					className="inline-flex items-center gap-1 text-(--link-text) hover:underline"
					title={value}
				>
					<span className="font-mono text-xs">{truncateMiddle(value)}</span>
					<Icon name="external-link" height={10} width={10} />
				</a>
			)
		},
		size: 170
	})
]

const transformTransactionForTable = (tx: BridgeTransaction): TransformedTransaction => {
	const timestamp = Math.floor(new Date(tx.ts).getTime() / 1000)
	const usdRaw = tx.usd_value == null ? null : parseFloat(String(tx.usd_value))
	return {
		timestamp,
		bridge_name: tx.bridge_name,
		bridge_slug: slug(tx.bridge_name ?? ''),
		chain: tx.chain,
		is_deposit: tx.is_deposit,
		token: tx.token,
		amount: tx.amount,
		usd_value: usdRaw != null && Number.isFinite(usdRaw) ? usdRaw : null,
		tx_from: tx.tx_from,
		tx_to: tx.tx_to,
		tx_hash: tx.tx_hash
	}
}

interface FetchArgs {
	bridges: RawBridgeInfo[]
	startDate: string
	endDate: string
	selectedBridge: string
}

const fetchTransactions = async ({ bridges, startDate, endDate, selectedBridge }: FetchArgs) => {
	const selectedBridgeData = bridges.find((bridge) => bridge.displayName === selectedBridge)
	if (!selectedBridgeData?.id) {
		throw new Error('Invalid bridge selected')
	}

	const startTimestamp = Math.floor(new Date(startDate).getTime() / 1000)
	const endTimestamp = Math.floor(new Date(endDate).getTime() / 1000) + 86400

	if (startTimestamp >= endTimestamp) {
		throw new Error('Invalid date range')
	}

	const bridgeId = selectedBridgeData.id
	const pages: BridgeTransaction[][] = []
	let currentEndTimestamp = endTimestamp
	let iterations = 0

	while (iterations < MAX_ITERATIONS) {
		const transactions = await fetchBridgeTransactionsClient(bridgeId, startTimestamp, currentEndTimestamp)

		if (!transactions?.length) {
			break
		}

		pages.push(transactions)

		if (transactions.length < 6000) {
			break
		}

		const earliestTx = transactions[transactions.length - 1]
		const earliestTimestamp = Math.floor(new Date(earliestTx.ts).getTime() / 1000)

		if (earliestTimestamp >= currentEndTimestamp) {
			break
		}

		currentEndTimestamp = earliestTimestamp - 1
		if (currentEndTimestamp <= startTimestamp) {
			break
		}
		iterations++
	}

	const seen = new Set<string>()
	const dedupedTransactions: Array<BridgeTransaction & { _ts: number }> = []
	for (const page of pages) {
		for (const tx of page) {
			if (seen.has(tx.tx_hash)) continue
			seen.add(tx.tx_hash)
			dedupedTransactions.push({ ...tx, _ts: Math.floor(new Date(tx.ts).getTime() / 1000) })
		}
	}

	dedupedTransactions.sort((a, b) => b._ts - a._ts)
	return dedupedTransactions.map(({ _ts, ...tx }) => tx)
}

const toDateOnly = (date: Date) => date.toISOString().split('T')[0]

const formatDateLabel = (value: string) => {
	if (!value) return ''
	const [year, month, day] = value.split('-').map(Number)
	const d = new Date(year, (month ?? 1) - 1, day ?? 1)
	return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

interface StatCardProps {
	label: string
	value: React.ReactNode
	sublabel?: React.ReactNode
	accent?: 'default' | 'success' | 'error'
}

function StatCard({ label, value, sublabel, accent = 'default' }: StatCardProps) {
	const accentClass =
		accent === 'success' ? 'text-(--success)' : accent === 'error' ? 'text-(--error)' : 'text-(--text-primary)'
	return (
		<div className="flex flex-col gap-1 rounded-md border border-(--cards-border) bg-(--cards-bg) p-4">
			<span className="text-xs font-medium tracking-wide text-(--text-label) uppercase">{label}</span>
			<span className={`text-2xl font-semibold tabular-nums ${accentClass}`}>{value}</span>
			{sublabel ? <span className="text-xs text-(--text-tertiary)">{sublabel}</span> : null}
		</div>
	)
}

function EmptyState({ hasFetched }: { hasFetched: boolean }) {
	return (
		<div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-(--cards-border) bg-(--cards-bg) px-6 py-16 text-center">
			<div className="flex h-12 w-12 items-center justify-center rounded-full bg-(--link-bg) text-(--link-text)">
				<Icon name={hasFetched ? 'search' : 'activity'} height={22} width={22} />
			</div>
			<h2 className="text-lg font-semibold">
				{hasFetched ? 'No transactions in this range' : 'Explore bridge transaction data'}
			</h2>
			<p className="max-w-md text-sm text-(--text-label)">
				{hasFetched
					? 'Try a wider date range or a different bridge. Transactions may be sparse for smaller bridges or short windows.'
					: 'Pick a bridge and a date range, then fetch transactions. Results can be filtered, sorted, and exported as CSV.'}
			</p>
		</div>
	)
}

export const BridgeTransactionsPage = ({ bridges }: { bridges: RawBridgeInfo[] }) => {
	const defaultEndDate = new Date()
	const defaultStartDate = new Date(defaultEndDate)
	defaultStartDate.setMonth(defaultEndDate.getMonth() - 1)

	const [transactions, setTransactions] = React.useState<BridgeTransaction[]>([])
	const [fetchedContext, setFetchedContext] = React.useState<{
		startDate: string
		endDate: string
		bridgeName: string
	} | null>(null)
	const [selectedBridge, setSelectedBridge] = React.useState<string[]>([])

	const { mutate, isPending, error } = useMutation({
		mutationFn: fetchTransactions,
		onSuccess: (data, variables) => {
			setTransactions(data)
			setFetchedContext({
				startDate: variables.startDate,
				endDate: variables.endDate,
				bridgeName: variables.selectedBridge
			})
		}
	})

	const { startDate, endDate, dateError, handleStartDateChange, handleEndDateChange, validateDateRange } =
		useDateRangeValidation({
			initialStartDate: toDateOnly(defaultStartDate),
			initialEndDate: toDateOnly(defaultEndDate)
		})

	const { data: blockExplorersData } = useBlockExplorers()

	const bridgeOptions = React.useMemo(
		() =>
			[...bridges]
				.sort((a, b) => (b.last24hVolume ?? 0) - (a.last24hVolume ?? 0))
				.map((bridge) => ({ key: bridge.displayName, name: bridge.displayName })),
		[bridges]
	)

	const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
		e.preventDefault()
		const bridgeName = selectedBridge[0]
		if (!bridgeName) {
			return
		}
		if (!validateDateRange(startDate, endDate)) {
			return
		}
		mutate({
			startDate,
			endDate,
			selectedBridge: bridgeName,
			bridges
		})
	}

	const maxDate = toDateOnly(new Date())

	const tableData = React.useMemo(() => transactions.map(transformTransactionForTable), [transactions])
	const columns = React.useMemo(() => buildBridgeColumns(blockExplorersData), [blockExplorersData])

	const stats = React.useMemo(() => {
		if (tableData.length === 0) return null
		let deposits = 0
		let withdrawals = 0
		let depositVolume = 0
		let withdrawalVolume = 0
		let unknownValueCount = 0
		const uniqueChains = new Set<string>()
		for (const tx of tableData) {
			uniqueChains.add(tx.chain)
			if (tx.is_deposit) {
				deposits++
				if (tx.usd_value != null) depositVolume += tx.usd_value
				else unknownValueCount++
			} else {
				withdrawals++
				if (tx.usd_value != null) withdrawalVolume += tx.usd_value
				else unknownValueCount++
			}
		}
		const totalVolume = depositVolume + withdrawalVolume
		return {
			total: tableData.length,
			deposits,
			withdrawals,
			depositVolume,
			withdrawalVolume,
			totalVolume,
			unknownValueCount,
			uniqueChains: uniqueChains.size
		}
	}, [tableData])

	const csvFileName = fetchedContext
		? `bridge-transactions_${slug(fetchedContext.bridgeName)}_${fetchedContext.startDate}_${fetchedContext.endDate}`
		: `bridge-transactions_${startDate}_${endDate}`

	const formError = (error as Error | null)?.message ?? dateError ?? null
	const showEmpty = transactions.length === 0 && !isPending

	return (
		<div className="flex flex-col gap-6">
			<header className="flex flex-col gap-2">
				<h1 className="text-2xl font-bold tracking-tight md:text-3xl">Bridge Transactions</h1>
				<p className="max-w-2xl text-sm text-(--text-label)">
					Download cross-chain bridge transaction data by protocol and time window. Results include deposits,
					withdrawals, USD value, and explorer links — exportable as CSV.
				</p>
			</header>

			<form
				onSubmit={handleSubmit}
				className="grid grid-cols-1 gap-3 rounded-md border border-(--cards-border) bg-(--cards-bg) p-4 md:grid-cols-[minmax(240px,1.4fr)_repeat(2,minmax(150px,1fr))_auto] md:items-end"
			>
				<label className="flex flex-col gap-1.5">
					<span className="text-xs font-medium tracking-wide text-(--text-label) uppercase">Bridge</span>
					<SelectWithCombobox
						allValues={bridgeOptions}
						selectedValues={selectedBridge}
						setSelectedValues={setSelectedBridge}
						singleSelect
						label={selectedBridge[0] ?? 'Select a bridge'}
						labelType="none"
						triggerProps={{
							className:
								'flex h-9 w-full cursor-pointer items-center justify-between gap-2 rounded-md border border-(--form-control-border) bg-(--bg-input) px-3 text-sm text-(--text-primary) hover:bg-(--link-bg) focus-visible:border-(--link-text) focus-visible:outline-none data-[state=open]:border-(--link-text)'
						}}
					/>
				</label>
				<label className="flex flex-col gap-1.5">
					<span className="text-xs font-medium tracking-wide text-(--text-label) uppercase">Start Date</span>
					<input
						type="date"
						name="startDate"
						value={startDate}
						onChange={(e) => handleStartDateChange(e.target.value)}
						max={maxDate}
						required
						className="h-9 cursor-pointer rounded-md border border-(--form-control-border) bg-(--bg-input) px-3 text-sm text-(--text-primary) focus:border-(--link-text) focus:outline-none dark:scheme-dark"
					/>
				</label>
				<label className="flex flex-col gap-1.5">
					<span className="text-xs font-medium tracking-wide text-(--text-label) uppercase">End Date</span>
					<input
						type="date"
						name="endDate"
						value={endDate}
						onChange={(e) => handleEndDateChange(e.target.value)}
						min={startDate}
						max={maxDate}
						required
						className="h-9 cursor-pointer rounded-md border border-(--form-control-border) bg-(--bg-input) px-3 text-sm text-(--text-primary) focus:border-(--link-text) focus:outline-none dark:scheme-dark"
					/>
				</label>
				<button
					type="submit"
					className="flex h-9 items-center justify-center gap-2 rounded-md bg-(--link-bg) px-5 text-sm font-semibold whitespace-nowrap text-(--link-text) transition-colors hover:bg-(--link-hover-bg) focus-visible:outline-2 focus-visible:outline-(--link-text) disabled:cursor-not-allowed disabled:opacity-60"
					disabled={isPending || !selectedBridge[0]}
				>
					{isPending ? (
						<>
							Fetching
							<LoadingDots />
						</>
					) : (
						<>
							<Icon name="search" height={14} width={14} />
							Fetch Transactions
						</>
					)}
				</button>

				{formError ? (
					<p className="col-span-full flex items-center gap-2 rounded-md border border-(--error)/30 bg-(--error)/10 px-3 py-2 text-sm text-(--error)">
						<Icon name="alert-triangle" height={14} width={14} />
						{formError}
					</p>
				) : null}
			</form>

			{isPending ? (
				<div className="flex flex-col items-center gap-3 rounded-md border border-(--cards-border) bg-(--cards-bg) px-6 py-16 text-center">
					<LoadingDots />
					<p className="text-sm text-(--text-label)">
						Fetching transactions. Large ranges may take a moment as we page through results.
					</p>
				</div>
			) : null}

			{!isPending && stats && fetchedContext ? (
				<div className="flex flex-col gap-4">
					<div className="flex flex-wrap items-center gap-2 text-xs text-(--text-label)">
						<span className="inline-flex items-center gap-1.5 rounded-full border border-(--cards-border) bg-(--cards-bg) px-2.5 py-1 font-medium text-(--text-primary)">
							{fetchedContext.bridgeName}
						</span>
						<span className="text-(--text-tertiary)">
							{formatDateLabel(fetchedContext.startDate)} → {formatDateLabel(fetchedContext.endDate)}
						</span>
						<span className="text-(--text-tertiary)">
							· {stats.uniqueChains} chain{stats.uniqueChains === 1 ? '' : 's'}
						</span>
					</div>

					<div className="grid grid-cols-2 gap-3 md:grid-cols-4">
						<StatCard
							label="Transactions"
							value={formattedNum(stats.total)}
							sublabel={stats.unknownValueCount > 0 ? `${stats.unknownValueCount} without USD value` : undefined}
						/>
						<StatCard
							label="Total Volume"
							value={formattedNum(stats.totalVolume, true)}
							sublabel="USD, priced rows only"
						/>
						<StatCard
							label="Deposits"
							value={formattedNum(stats.deposits)}
							sublabel={formattedNum(stats.depositVolume, true)}
							accent="success"
						/>
						<StatCard
							label="Withdrawals"
							value={formattedNum(stats.withdrawals)}
							sublabel={formattedNum(stats.withdrawalVolume, true)}
							accent="error"
						/>
					</div>
				</div>
			) : null}

			{!isPending && transactions.length > 0 ? (
				<TransactionsTable data={tableData} columns={columns} csvFileName={csvFileName} />
			) : null}

			{showEmpty ? <EmptyState hasFetched={fetchedContext != null} /> : null}
		</div>
	)
}

const PAGE_SIZE_OPTIONS = [25, 50, 100, 250, 500] as const
const DEFAULT_PAGE_SIZE = 100

function TransactionsTable({
	data,
	columns,
	csvFileName
}: {
	data: TransformedTransaction[]
	columns: ReturnType<typeof buildBridgeColumns>
	csvFileName: string
}) {
	const [sorting, setSorting] = React.useState<SortingState>([{ id: 'timestamp', desc: true }])
	const [globalFilter, setGlobalFilter] = React.useState('')
	const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: DEFAULT_PAGE_SIZE })
	const deferredFilter = React.useDeferredValue(globalFilter)

	const instance = useReactTable({
		data,
		columns,
		state: { sorting, globalFilter: deferredFilter, pagination },
		onSortingChange: (updater) => React.startTransition(() => setSorting(updater)),
		onGlobalFilterChange: setGlobalFilter,
		onPaginationChange: (updater) => React.startTransition(() => setPagination(updater)),
		globalFilterFn: 'includesString',
		enableSortingRemoval: false,
		defaultColumn: { sortUndefined: 'last' },
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getPaginationRowModel: getPaginationRowModel()
	})

	React.useEffect(() => {
		React.startTransition(() => {
			setPagination((prev) => (prev.pageIndex === 0 ? prev : { ...prev, pageIndex: 0 }))
		})
	}, [deferredFilter, sorting])

	const filteredCount = instance.getFilteredRowModel().rows.length
	const pageCount = instance.getPageCount()
	const { pageIndex, pageSize } = instance.getState().pagination
	const pageStart = filteredCount === 0 ? 0 : pageIndex * pageSize + 1
	const pageEnd = Math.min(filteredCount, pageStart + pageSize - 1)

	const prepareCsv = React.useCallback(() => {
		const visibleCols = instance.getVisibleLeafColumns().filter((c) => !c.columnDef.meta?.hidden)
		const headers = visibleCols.map((column) => {
			const csvHeader = (column.columnDef.meta as { csvHeader?: unknown } | undefined)?.csvHeader
			if (typeof csvHeader === 'string' && csvHeader.length > 0) return csvHeader
			const h = column.columnDef.header
			return typeof h === 'string' ? h : (column.columnDef.id ?? column.id)
		})
		const filteredRows = instance.getPrePaginationRowModel().rows
		const rows = filteredRows.map((row) =>
			visibleCols.map((column) => {
				const value = row.getValue(column.id)
				if (value == null) return ''
				if (typeof value === 'number') return Number.isFinite(value) ? value : ''
				if (typeof value === 'string' || typeof value === 'boolean') return value
				return ''
			})
		)
		return { filename: csvFileName, rows: [headers, ...rows] }
	}, [instance, csvFileName])

	return (
		<div className="rounded-md border border-(--cards-border) bg-(--cards-bg)">
			<div className="flex w-full flex-wrap items-center justify-end gap-3 p-3">
				<h2 className="mr-auto text-lg font-semibold">Transactions</h2>
				<label className="relative w-full max-w-full sm:max-w-[280px]">
					<span className="sr-only">Search transactions</span>
					<Icon
						name="search"
						height={14}
						width={14}
						className="absolute top-0 bottom-0 left-2.5 my-auto text-(--text-tertiary)"
					/>
					<input
						value={globalFilter}
						onChange={(e) => setGlobalFilter(e.target.value)}
						placeholder="Search hash, address, token, chain…"
						className="h-8 w-full rounded-md border border-(--form-control-border) bg-(--bg-input) pr-2 pl-7 text-sm text-(--text-primary) placeholder:text-(--text-tertiary) focus:border-(--link-text) focus:outline-none"
					/>
				</label>
				<span className="text-xs whitespace-nowrap text-(--text-label)">
					{filteredCount === data.length
						? `${formattedNum(filteredCount)} rows`
						: `${formattedNum(filteredCount)} of ${formattedNum(data.length)}`}
				</span>
				<CSVDownloadButton prepareCsv={prepareCsv} smol />
			</div>

			<VirtualTable instance={instance} rowSize={48} />

			<div className="flex flex-wrap items-center justify-between gap-3 border-t border-(--cards-border) p-3 text-xs text-(--text-label)">
				<span className="tabular-nums">
					{filteredCount === 0
						? 'No rows'
						: `${formattedNum(pageStart)}–${formattedNum(pageEnd)} of ${formattedNum(filteredCount)}`}
				</span>

				<div className="flex items-center gap-1">
					<PagerButton
						aria-label="First page"
						onClick={() => React.startTransition(() => instance.setPageIndex(0))}
						disabled={!instance.getCanPreviousPage()}
					>
						<Icon name="chevrons-left" height={14} width={14} />
					</PagerButton>
					<PagerButton
						aria-label="Previous page"
						onClick={() => React.startTransition(() => instance.previousPage())}
						disabled={!instance.getCanPreviousPage()}
					>
						<Icon name="chevron-left" height={14} width={14} />
					</PagerButton>
					<span className="px-2 font-medium text-(--text-primary) tabular-nums">
						{pageCount === 0 ? '0 / 0' : `${pageIndex + 1} / ${pageCount}`}
					</span>
					<PagerButton
						aria-label="Next page"
						onClick={() => React.startTransition(() => instance.nextPage())}
						disabled={!instance.getCanNextPage()}
					>
						<Icon name="chevron-right" height={14} width={14} />
					</PagerButton>
					<PagerButton
						aria-label="Last page"
						onClick={() => React.startTransition(() => instance.setPageIndex(Math.max(0, pageCount - 1)))}
						disabled={!instance.getCanNextPage()}
					>
						<Icon name="chevrons-right" height={14} width={14} />
					</PagerButton>
				</div>

				<label className="flex items-center gap-2">
					<span>Rows</span>
					<select
						value={pageSize}
						onChange={(e) =>
							React.startTransition(() => {
								instance.setPageSize(Number(e.target.value))
								instance.setPageIndex(0)
							})
						}
						className="h-7 rounded-md border border-(--form-control-border) bg-(--bg-input) px-2 text-xs text-(--text-primary) focus:border-(--link-text) focus:outline-none"
					>
						{PAGE_SIZE_OPTIONS.map((size) => (
							<option key={size} value={size}>
								{size}
							</option>
						))}
					</select>
				</label>
			</div>
		</div>
	)
}

function PagerButton({ children, disabled, onClick, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			className="flex h-7 w-7 items-center justify-center rounded-md border border-(--cards-border) text-(--text-secondary) transition-colors hover:bg-(--link-bg) hover:text-(--link-text) disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
			{...rest}
		>
			{children}
		</button>
	)
}
