import * as React from 'react'
import { useMutation } from '@tanstack/react-query'
import { LoadingDots } from '~/components/Loaders'
import { BRIDGETX_API } from '~/constants'
import { useDateRangeValidation } from '~/hooks/useDateRangeValidation'
import { download, toNiceCsvDate } from '~/utils'
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

const downloadCsv = (transactions: BridgeTransaction[]) => {
	const rows = [
		['Timestamp', 'Date', 'Bridge', 'Chain', 'Deposit/Withdrawal', 'Token', 'Amount', 'USD Value', 'From', 'To', 'Hash']
	]
	transactions.forEach((tx) => {
		const timestamp = Math.floor(new Date(tx.ts).getTime() / 1000).toString()
		rows.push([
			timestamp,
			toNiceCsvDate(timestamp),
			tx.bridge_name,
			tx.chain,
			tx.is_deposit ? 'withdrawal' : 'deposit',
			tx.token,
			tx.amount,
			tx.usd_value,
			tx.tx_from,
			tx.tx_to,
			tx.tx_hash
		])
	})
	download(
		`bridge-transactions.csv`,
		rows
			.sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
			.map((r) => r.join(','))
			.join('\n')
	)
}

const downloadTxs = async ({ bridges, startDate, endDate, selectedBridge }) => {
	try {
		const startTimestamp = Math.floor(new Date(startDate).getTime() / 1000)
		const endTimestamp = Math.floor(new Date(endDate).getTime() / 1000) + 86400
		const selectedBridgeData = bridges.find((bridge) => bridge.displayName === selectedBridge)
		const bridgeId = selectedBridgeData?.id
		if (!bridgeId) return
		let accTransactions = []
		let numberTxsReturned = 0
		let earliestTsReturned = 0
		let endTimestampParam = endTimestamp
		let iterations = 0

		do {
			const transactions = await fetchJson(
				`${BRIDGETX_API}/${bridgeId}?starttimestamp=${startTimestamp}&endtimestamp=${endTimestampParam}`
			)
			numberTxsReturned = transactions?.length
			if (numberTxsReturned) {
				const earliestTx = transactions[transactions.length - 1]
				earliestTsReturned = Math.floor(new Date(earliestTx.ts).getTime() / 1000)
				endTimestampParam = earliestTsReturned
				iterations += 1
				accTransactions = [...transactions, ...accTransactions]
			} else break
		} while (numberTxsReturned === 6000 && iterations < 50)

		downloadCsv(accTransactions)
	} catch (error) {
		throw new Error(error instanceof Error ? error.message : 'Failed to download')
	}
}

export const BridgeTransactionsPage = ({ bridges }) => {
	const defaultEndDate = new Date()
	const defaultStartDate = new Date(defaultEndDate)
	defaultStartDate.setMonth(defaultEndDate.getMonth() - 1)

	const { mutate, isPending, error } = useMutation({ mutationFn: downloadTxs })

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

	return (
		<>
			<div className="flex w-full max-w-sm flex-col items-center gap-3 rounded-md border border-(--cards-border) bg-(--cards-bg) p-3 xl:absolute xl:top-0 xl:right-0 xl:left-0 xl:m-auto xl:mt-[132px]">
				<h1 className="text-xl font-semibold">Generate Bridge Transactions CSV</h1>

				<form className="mx-auto my-8 flex flex-col gap-4" onSubmit={handleSubmit}>
					<span className="flex flex-wrap gap-4">
						<label className="flex flex-col">
							<span className="text-base font-medium">Start Date</span>
							<input
								type="date"
								name="startDate"
								value={startDate}
								onChange={(e) => handleStartDateChange(e.target.value)}
								required
								className="placeholder:text-opacity-40 cursor-pointer rounded-lg bg-[#f2f2f2] px-3 py-2 text-base text-black dark:bg-black dark:text-white dark:[color-scheme:dark]"
							/>
						</label>
						<label className="flex flex-col">
							<span className="text-base font-medium">End Date</span>
							<input
								type="date"
								name="endDate"
								value={endDate}
								onChange={(e) => handleEndDateChange(e.target.value)}
								min={startDate}
								required
								className="placeholder:text-opacity-40 cursor-pointer rounded-lg bg-[#f2f2f2] px-3 py-2 text-base text-black dark:bg-black dark:text-white dark:[color-scheme:dark]"
							/>
						</label>
					</span>
					<select
						name="selectedBridge"
						className="placeholder:text-opacity-40 rounded-lg bg-[#f2f2f2] px-3 py-2 text-base text-black dark:bg-black dark:text-white"
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
								Downloading
								<LoadingDots />
							</>
						) : (
							'Download .CSV'
						)}
					</button>

					{dateError ? <p className="text-center text-red-500">{dateError}</p> : null}
					{error ? <p className="text-center text-red-500">{(error as any).message}</p> : null}
				</form>
			</div>
		</>
	)
}
