import { useMutation } from '@tanstack/react-query'
import { createColumnHelper } from '@tanstack/react-table'
import { useMemo, useState } from 'react'
import { LoadingDots } from '~/components/Loaders'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { useDateRangeValidation } from '~/hooks/useDateRangeValidation'
import { toNiceDayAndHour } from '~/utils'
import { fetchBridgeTransactions } from './api'

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
	date: string
	bridge_name: string
	chain: string
	type: string
	token: string
	amount: string
	usd_value: string | number | null
	tx_from: string
	tx_to: string
	tx_hash: string
}

const columnHelper = createColumnHelper<TransformedTransaction>()

const bridgeTransactionsColumns = [
	columnHelper.accessor('date', {
		header: 'Date',
		cell: ({ getValue }) => getValue(),
		size: 150
	}),
	columnHelper.accessor('bridge_name', {
		header: 'Bridge',
		cell: ({ getValue }) => getValue(),
		size: 150
	}),
	columnHelper.accessor('chain', {
		header: 'Chain',
		cell: ({ getValue }) => getValue(),
		size: 120
	}),
	columnHelper.accessor('type', {
		header: 'Type',
		cell: ({ getValue }) => (
			<span className={getValue() === 'deposit' ? 'text-green-600' : 'text-red-600'}>{getValue()}</span>
		),
		size: 100
	}),
	columnHelper.accessor('token', {
		header: 'Token',
		cell: ({ getValue }) => getValue(),
		size: 100
	}),
	columnHelper.accessor('amount', {
		header: 'Amount',
		cell: ({ getValue }) => (
			<span className="inline-block max-w-30 truncate" title={getValue()}>
				{getValue()}
			</span>
		),
		size: 150
	}),
	columnHelper.accessor('usd_value', {
		header: 'USD Value',
		cell: ({ getValue }) => {
			const value = parseFloat(String(getValue()))
			return Number.isNaN(value) ? getValue() : `$${value.toLocaleString()}`
		},
		size: 120,
		meta: {
			align: 'end' as const
		}
	}),
	columnHelper.accessor('tx_from', {
		header: 'From',
		cell: ({ getValue }) => (
			<span className="inline-block max-w-30 truncate" title={getValue()}>
				{getValue()}
			</span>
		),
		size: 150
	}),
	columnHelper.accessor('tx_to', {
		header: 'To',
		cell: ({ getValue }) => (
			<span className="inline-block max-w-30 truncate" title={getValue()}>
				{getValue()}
			</span>
		),
		size: 150
	}),
	columnHelper.accessor('tx_hash', {
		header: 'Hash',
		cell: ({ getValue }) => (
			<span className="inline-block max-w-30 truncate" title={getValue()}>
				{getValue()}
			</span>
		),
		size: 150
	})
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
		const transactions = await fetchBridgeTransactions(bridgeId, startTimestamp, currentEndTimestamp)

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
	const [fetchedDateRange, setFetchedDateRange] = useState<{ startDate: string; endDate: string } | null>(null)

	const { mutate, isPending, error } = useMutation({
		mutationFn: fetchTransactions,
		onSuccess: (data, variables) => {
			setTransactions(data)
			setFetchedDateRange({
				startDate: variables.startDate,
				endDate: variables.endDate
			})
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
	const csvDateRange = fetchedDateRange ?? { startDate, endDate }

	const tableData = useMemo(() => transactions.map(transformTransactionForTable), [transactions])

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

			{transactions.length > 0 ? (
				<TableWithSearch
					data={tableData}
					columns={bridgeTransactionsColumns}
					header="Bridge Transactions"
					customFilters={() => (
						<div className="flex items-center justify-between gap-3">
							<span>({transactions.length.toLocaleString()}) transactions</span>
						</div>
					)}
					csvFileName={`bridge-transactions_${csvDateRange.startDate}_${csvDateRange.endDate}`}
					sortingState={[{ id: 'date', desc: true }]}
				/>
			) : null}
		</div>
	)
}
