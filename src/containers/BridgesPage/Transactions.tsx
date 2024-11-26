import { useMutation } from '@tanstack/react-query'
import * as React from 'react'
import { BRIDGETX_API } from '~/constants'
import { download, toNiceCsvDate } from '~/utils'

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
			const transactions = await fetch(
				`${BRIDGETX_API}/${bridgeId}?starttimestamp=${startTimestamp}&endtimestamp=${endTimestampParam}`
			).then((resp) => resp.json())
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
	const { mutate, isPending, error } = useMutation({ mutationFn: downloadTxs })

	return (
		<>
			<h1 className="text-2xl font-medium">Generate Bridge Transactions CSV</h1>

			<form
				className="mx-auto my-8 flex flex-col gap-4"
				onSubmit={(e) => {
					e.preventDefault()
					const formEl = e.target as HTMLFormElement
					const formData = new FormData(formEl)

					mutate({
						startDate: formData.get('startDate'),
						endDate: formData.get('endDate'),
						selectedBridge: formData.get('selectedBridge'),
						bridges
					})
				}}
			>
				<span className="flex gap-4 flex-wrap">
					<label className="flex flex-col">
						<span className="text-base font-medium">Start Date</span>
						<input
							type="date"
							name="startDate"
							required
							className="py-2 px-3 text-base bg-[#f2f2f2] dark:bg-black text-black dark:text-white rounded-lg placeholder:text-opacity-40"
						/>
					</label>
					<label className="flex flex-col">
						<span className="text-base font-medium">End Date</span>
						<input
							type="date"
							name="endDate"
							required
							className="py-2 px-3 text-base bg-[#f2f2f2] dark:bg-black text-black dark:text-white rounded-lg placeholder:text-opacity-40"
						/>
					</label>
				</span>
				<select
					name="selectedBridge"
					className="py-2 px-3 text-base bg-[#f2f2f2] dark:bg-black text-black dark:text-white rounded-lg placeholder:text-opacity-40"
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
					className="py-2 px-3 text-base font-semibold rounded-lg bg-[var(--link-bg)] text-[var(--link-text)] whitespace-nowrap hover:bg-[var(--link-hover-bg)] focus-visible:bg-[var(--link-active-bg)] disabled:cursor-not-allowed disabled:opacity-60"
					disabled={isPending}
				>
					{isPending ? 'Downloading...' : 'Download .CSV'}
				</button>

				{error ? <p className="text-red-500 text-center">{(error as any).message}</p> : null}
			</form>
		</>
	)
}
