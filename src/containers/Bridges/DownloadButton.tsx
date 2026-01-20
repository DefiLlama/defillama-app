import * as React from 'react'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { toNiceCsvDate } from '~/utils'

export const LargeTxDownloadButton = ({ data }: { data: any }) => {
	const prepareCsv = () => {
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
		const sortedData = data.sort((a, b) => a.date - b.date)
		for (const tx of sortedData) {
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
		}

		return { filename: 'bridge-transactions.csv', rows }
	}

	return <CSVDownloadButton prepareCsv={prepareCsv} smol className="mr-2" />
}
