import * as React from 'react'
import { download, toNiceCsvDate } from '~/utils'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'

export const LargeTxDownloadButton = ({ data }: { data: any }) => {
	return (
		<CSVDownloadButton
			onClick={async () => {
				const rows = [
					[
						'Timestamp',
						'Date',
						'Bridge',
						'Chain',
						'Deposit/Withdrawal',
						'Symbol',
						'USD Value',
						'Token',
						'Amount',
						'From',
						'To',
						'Hash'
					]
				]
				data
					.sort((a, b) => a.date - b.date)
					.forEach((tx) => {
						rows.push([
							tx.date,
							toNiceCsvDate(tx.date),
							tx.bridge,
							tx.chain,
							tx.isDeposit ? 'withdrawal' : 'deposit',
							tx.symbol.split('#')[0] ?? '',
							tx.usdValue,
							tx.token,
							tx.amount,
							tx.from,
							tx.to,
							tx.txHash.split(':')[1] ?? ''
						])
					})
				download(`bridge-transactions.csv`, rows.map((r) => r.join(',')).join('\n'))
			}}
		/>
	)
}
