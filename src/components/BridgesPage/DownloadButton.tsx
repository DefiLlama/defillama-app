import * as React from 'react'
import styled from 'styled-components'
import { download, toNiceCsvDate } from '~/utils'
import CSVDownloadButton from '../ButtonStyled/CsvButton'

const DownloadButtonContainer = styled.button`
	display: none;
	padding: 4px 6px;
	border-radius: 6px;
	background: ${({ theme }) => theme.bg3};
	bottom: 8px;
	right: 8px;
	align-items: center;
	height: 28px;

	@media (min-width: 80rem) {
		display: flex;
	}
`
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
