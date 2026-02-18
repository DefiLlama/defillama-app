import { useMutation } from '@tanstack/react-query'
import type { ColumnDef, Table } from '@tanstack/react-table'
import { useCallback, useMemo, useState } from 'react'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { LoadingDots } from '~/components/Loaders'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { BRIDGETX_API } from '~/constants'
import { useDateRangeValidation } from '~/hooks/useDateRangeValidation'
import { toNiceDayAndHour } from '~/utils'
import { fetchJson } from '~/utils/async'

type BridgeTransaction = {
	tx_hash: string
	ts: string
	tx_block: string
	tx_from: string
	tx_to: string
	token: string
	amount: string
	is_deposit: boolean
	chain: string
	bridge_name: string
	usd_value: string
}

const MAX_ITERATIONS = 50

interface TransformedTransaction {
	date: string
	bridge_name: string
	chain: string
	type: string
	token: string
	amount: string
	usd_value: string
	tx_from: string
	tx_to: string
	tx_hash: string
}

const bridgeTransactionsColumns: ColumnDef<TransformedTransaction>[] = [
	{
		header: 'Date',
		accessorKey: 'date',
		cell: ({ getValue }) => getValue(),
		size: 150
	},
	{
		header: 'Bridge',
		accessorKey: 'bridge_name',
		cell: ({ getValue }) => getValue(),
		size: 150
	},
	{
		header: 'Chain',
		accessorKey: 'chain',
		cell: ({ getValue }) => getValue(),
		size: 120
	},
	{
		header: 'Type',
		accessorKey: 'type',
		cell: ({ getValue }) => (
			<span className={getValue() === 'deposit' ? 'text-green-600' : 'text-red-600'}>{getValue() as string}</span>
		),
		size: 100
	},
	{
		header: 'Token',
		accessorKey: 'token',
		cell: ({ getValue }) => getValue(),
		size: 100
	},
	{
		header: 'Amount',
		accessorKey: 'amount',
		cell: ({ getValue }) => (
			<span className="inline-block max-w-30 truncate" title={getValue() as string}>
				{getValue() as string}
			</span>
		),
		size: 150
	},
	{
		header: 'USD Value',
		accessorKey: 'usd_value',
		cell: ({ getValue }) => {
			const value = parseFloat(getValue() as string)
			return isNaN(value) ? getValue() : `$${value.toLocaleString()}`
		},
		size: 120,
		meta: {
			align: 'end' as const
		}
	},
	{
		header: 'From',
		accessorKey: 'tx_from',
		cell: ({ getValue }) => (
			<span className="inline-block max-w-30 truncate" title={getValue() as string}>
				{getValue() as string}
			</span>
		),
		size: 150
	},
	{
		header: 'To',
		accessorKey: 'tx_to',
		cell: ({ getValue }) => (
			<span className="inline-block max-w-30 truncate" title={getValue() as string}>
				{getValue() as string}
			</span>
		),
		size: 150
	},
	{
		header: 'Hash',
		accessorKey: 'tx_hash',
		cell: ({ getValue }) => (
			<span className="inline-block max-w-30 truncate" title={getValue() as string}>
				{getValue() as string}
			</span>
		),
		size: 150
	}
]

const transformTransactionForTable = (tx: BridgeTransaction): TransformedTransaction => {
	const timestamp = Math.floor(new Date(tx.ts).getTime() / 1000)
	return {
		date: toNiceDayAndHour(timestamp),
		bridge_name: tx.bridge_name,
		chain: tx.chain,
		type: tx.is_deposit ? 'deposit' : 'withdrawal',
		token: tx.token,
		amount: tx.amount,
		usd_value: tx.usd_value,
		tx_from: tx.tx_from,
		tx_to: tx.tx_to,
		tx_hash: tx.tx_hash
	}
}

const fetchTransactions = async ({ bridges, startDate, endDate, selectedBridge }) => {
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
	const allTransactions: BridgeTransaction[] = []
	let currentEndTimestamp = endTimestamp
	let iterations = 0

	while (iterations < MAX_ITERATIONS) {
		const url = `${BRIDGETX_API}/${bridgeId}?starttimestamp=${startTimestamp}&endtimestamp=${currentEndTimestamp}`
		const transactions: BridgeTransaction[] = await fetchJson(url)

		if (!transactions?.length) {
			break
		}

		allTransactions.push(...transactions)

		if (transactions.length < 6000) {
			break
		}

		const earliestTx = transactions[transactions.length - 1]
		const earliestTimestamp = Math.floor(new Date(earliestTx.ts).getTime() / 1000)

		if (earliestTimestamp >= currentEndTimestamp) {
			console.log('Timestamp not decreasing, stopping pagination')
			break
		}

		// Make end bound exclusive to avoid duplicating boundary timestamps
		currentEndTimestamp = earliestTimestamp - 1
		if (currentEndTimestamp <= startTimestamp) {
			break
		}
		iterations++
	}

	if (iterations >= MAX_ITERATIONS) {
		console.log(`Reached maximum iterations (${MAX_ITERATIONS}). Some transactions may be missing.`)
	}

	// Dedupe across pagination boundaries
	const seen = new Set<string>()
	const dedupedTransactions: BridgeTransaction[] = []
	for (const tx of allTransactions) {
		if (seen.has(tx.tx_hash)) continue
		seen.add(tx.tx_hash)
		dedupedTransactions.push(tx)
	}

	dedupedTransactions.sort((a, b) => {
		const tsA = Math.floor(new Date(a.ts).getTime() / 1000)
		const tsB = Math.floor(new Date(b.ts).getTime() / 1000)
		return tsB - tsA
	})

	return dedupedTransactions
}

export const BridgeTransactionsPage = ({ bridges }) => {
	const defaultEndDate = new Date()
	const defaultStartDate = new Date(defaultEndDate)
	defaultStartDate.setMonth(defaultEndDate.getMonth() - 1)

	const [transactions, setTransactions] = useState<BridgeTransaction[]>([])

	const { mutate, isPending, error } = useMutation({
		mutationFn: fetchTransactions,
		onSuccess: (data) => {
			setTransactions(data)
		}
	})

	const { startDate, endDate, dateError, handleStartDateChange, handleEndDateChange, validateDateRange } =
		useDateRangeValidation({
			initialStartDate: defaultStartDate.toISOString().split('T')[0],
			initialEndDate: defaultEndDate.toISOString().split('T')[0]
		})

	const handleSubmit = (e) => {
		e.preventDefault()
		const formEl = e.target as HTMLFormElement
		const formData = new FormData(formEl)

		const startDateValue = formData.get('startDate') as string
		const endDateValue = formData.get('endDate') as string

		if (!validateDateRange(startDateValue, endDateValue)) {
			return
		}

		mutate({
			startDate: startDateValue,
			endDate: endDateValue,
			selectedBridge: formData.get('selectedBridge'),
			bridges
		})
	}

	const maxDate = new Date().toISOString().split('T')[0]

	const tableData = useMemo(() => transactions.map(transformTransactionForTable), [transactions])

	const prepareCsv = useCallback(
		(instance: Table<any>) => {
			const filename = `bridge-transactions_${startDate}_${endDate}.csv`
			const columns = instance.getVisibleLeafColumns()
			const tableRows = instance.getRowModel().rows
			if (columns.length === 0 || tableRows.length === 0) return { filename, rows: [] }

			const headers = columns.map((column) =>
				typeof column.columnDef.header === 'string' ? column.columnDef.header : (column.id ?? '')
			)
			const dataRows: Array<Array<string | number | boolean>> = tableRows.map((row) =>
				columns.map((column) => {
					const value = row.getValue(column.id)
					if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value
					return value == null ? '' : String(value)
				})
			)
			const rows: Array<Array<string | number | boolean>> = [headers, ...dataRows]

			return { filename, rows }
		},
		[startDate, endDate]
	)

	return (
		<div className="mt-4 flex flex-col gap-4 lg:mt-10">
			<div className="flex w-full max-w-sm flex-col items-center gap-3 rounded-md border border-(--cards-border) bg-(--cards-bg) p-3 xl:mx-auto">
				<h1 className="text-xl font-semibold">Bridge Transactions</h1>

				<form className="mx-auto my-4 flex w-full flex-col gap-4" onSubmit={handleSubmit}>
					<span className="flex flex-wrap gap-4">
						<label className="flex min-w-35 flex-1 flex-col gap-2">
							<span className="text-base font-medium">Start Date</span>
							<input
								type="date"
								name="startDate"
								value={startDate}
								onChange={(e) => handleStartDateChange(e.target.value)}
								max={maxDate}
								required
								className="cursor-pointer rounded-lg bg-[#f2f2f2] px-3 py-2 text-base text-black placeholder:opacity-40 dark:bg-black dark:text-white dark:scheme-dark"
							/>
						</label>
						<label className="flex min-w-35 flex-1 flex-col gap-2">
							<span className="text-base font-medium">End Date</span>
							<input
								type="date"
								name="endDate"
								value={endDate}
								onChange={(e) => handleEndDateChange(e.target.value)}
								min={startDate}
								max={maxDate}
								required
								className="cursor-pointer rounded-lg bg-[#f2f2f2] px-3 py-2 text-base text-black placeholder:opacity-40 dark:bg-black dark:text-white dark:scheme-dark"
							/>
						</label>
					</span>
					<select
						name="selectedBridge"
						className="rounded-lg bg-[#f2f2f2] px-3 py-2 text-base text-black placeholder:opacity-40 dark:bg-black dark:text-white"
						required
					>
						<option value="">--Please choose a bridge--</option>
						{bridges.map((bridge) => (
							<option value={bridge.displayName} key={bridge.displayName}>
								{bridge.displayName}
							</option>
						))}
					</select>
					<button
						className="flex items-center justify-center gap-1 rounded-lg bg-(--link-bg) px-3 py-2 text-base font-semibold whitespace-nowrap text-(--link-text) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-active-bg) disabled:cursor-not-allowed disabled:opacity-60"
						disabled={isPending}
					>
						{isPending ? (
							<>
								Loading
								<LoadingDots />
							</>
						) : (
							'Fetch Transactions'
						)}
					</button>

					{dateError ? <p className="text-center text-red-500">{dateError}</p> : null}
					{error ? <p className="text-center text-red-500">{(error as any).message}</p> : null}
				</form>
			</div>

			{transactions.length > 0 && (
				<TableWithSearch
					data={tableData}
					columns={bridgeTransactionsColumns}
					header="Bridge Transactions"
					customFilters={({ instance }) => (
						<div className="flex items-center justify-between gap-3">
							<span>({transactions.length.toLocaleString()}) transactions</span>
							<CSVDownloadButton prepareCsv={() => prepareCsv(instance)} />
						</div>
					)}
					sortingState={[{ id: 'date', desc: true }]}
				/>
			)}
		</div>
	)
}
