import * as React from 'react'
import styled from 'styled-components'
import { Panel } from '~/components'
import { BridgesSearchSelect } from '~/components/Search/Bridges'
import { Form, FormError, FormInput, FormLabel, FormSubmit, useFormState } from 'ariakit'
import { BRIDGETX_API } from '~/constants'
import { download, toNiceCsvDate } from '~/utils'

import { fetchWithErrorLogging } from '~/utils/async'
import CSVDownloadButton from '../ButtonStyled/CsvButton'

const fetch = fetchWithErrorLogging

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

const SearchWrapper = styled.div`
	display: flex;
	flex-direction: column;
	gap: 8px;
	width: 100%;
	margin-top: 8px;

	& > * {
		gap: 8px;
		flex: 1;
	}

	& > * {
		& > *[data-searchicon='true'] {
			top: 14px;
			right: 16px;
		}
	}

	@media (min-width: ${({ theme }) => theme.bpMed}) {
		flex-direction: row;
	}
`

export const ToggleWrapper = styled.label`
	display: flex;
	align-items: center;
	flex-wrap: nowrap;
	gap: 8px;
	cursor: pointer;
`

const StyledFormInput = styled(FormInput)`
	color: ${({ theme }) => theme.text6};
	background: ${({ theme }) => theme.bg4};
`

const StyledFormSubmit = styled(FormSubmit)`
	color: ${({ theme }) => theme.text6};
	background: ${({ theme }) => theme.bg6};
	border: none;
	border-radius: 12px;
	outline: ${({ theme }) => '1px solid ' + theme.text1};

	@media screen and (min-width: ${({ theme }) => theme.bpLg}) {
		border: 1px solid ${({ theme }) => theme.divider};
		border-bottom: 0;
	}
`

const DateInputField = styled.div`
	padding: 14px 16px;
	background: ${({ theme }) => theme.bg6};
	color: ${({ theme }) => theme.text6};
	font-size: 1rem;
	border: none;
	border-radius: 12px;
	outline: none;

	::placeholder {
		color: ${({ theme }) => theme.text3};
		font-size: 1rem;
	}

	&[data-focus-visible] {
		outline: ${({ theme }) => '1px solid ' + theme.text4};
	}

	@media screen and (min-width: ${({ theme }) => theme.bpLg}) {
		border: 1px solid ${({ theme }) => theme.divider};
		border-bottom: 0;
	}
`

const Wrapper = styled.div`
	display: flex;
	flex-direction: column;
	position: relative;

	@media screen and (min-width: ${({ theme }) => theme.bpLg}) {
		display: flex;
		border-radius: 12px;
		box-shadow: ${({ theme }) => theme.shadowSm};
	}
`

const BridgeTransactionsPage = ({ bridges }) => {
	const form = useFormState({
		defaultValues: { startDate: '', endDate: '', selectedBridge: '' }
	})
	const [placeholder, setPlaceholder] = React.useState('Search...')

	const downloadCsv = (transactions: BridgeTransaction[]) => {
		{
			const rows = [
				[
					'Timestamp',
					'Date',
					'Bridge',
					'Chain',
					'Deposit/Withdrawal',
					'Token',
					'Amount',
					'USD Value',
					'From',
					'To',
					'Hash'
				]
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
	}

	form.useSubmit(async () => {
		const { startDate, endDate, selectedBridge } = form.values
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
	})

	return (
		<>
			<h1 className="text-2xl font-medium -mb-5">Generate Bridge Transactions CSV</h1>

			<Form state={form}>
				<SearchWrapper>
					<Wrapper>
						<DateInputField>
							<FormLabel name={form.names.startDate}>Start Date</FormLabel>
							<StyledFormInput name={form.names.startDate} type="date" required />
							<FormError name={form.names.startDate} className="error" />
						</DateInputField>
					</Wrapper>
					<Wrapper>
						<DateInputField>
							<FormLabel name={form.names.endDate}>End Date</FormLabel>
							<StyledFormInput name={form.names.endDate} type="date" required />
							<FormError name={form.names.endDate} className="error" />
						</DateInputField>
					</Wrapper>
					<BridgesSearchSelect
						formValueToEdit={form.values}
						formProperty={'selectedBridge'}
						placeholder={placeholder}
						click={(item) => setPlaceholder(item)}
					/>
					<CSVDownloadButton onClick={() => form.submit()} />
				</SearchWrapper>
			</Form>

			<Panel as="p" style={{ margin: 0, textAlign: 'center' }}>
				Download a CSV with all indexed transactions within a date range for chosen bridge.
			</Panel>
		</>
	)
}

export default BridgeTransactionsPage
