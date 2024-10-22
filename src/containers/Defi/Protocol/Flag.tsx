import { useDialogState, Dialog } from 'ariakit/dialog'
import { useState } from 'react'
import { FormSubmitBtn } from '~/components'
import { DialogForm } from '~/components/Filters/common/Base'
import { Icon } from '~/components/Icon'
import { Tooltip2 } from '~/components/Tooltip'

import { fetchWithErrorLogging } from '~/utils/async'

const fetch = fetchWithErrorLogging

export function Flag({ protocol, dataType, isLending }: { protocol: string; dataType?: string; isLending?: boolean }) {
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState(false)
	const dialog = useDialogState()
	const reportSuccess = useDialogState()

	const onSubmit = async (e) => {
		e.preventDefault()
		setError(false)
		setLoading(true)

		const form = e.target as HTMLFormElement

		const data = await fetch('https://api.llama.fi/reportError', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				protocol,
				dataType: dataType ?? form.dataType?.value ?? '',
				message: form.message?.value ?? '',
				correctSource: form.correctSource?.value ?? ''
			})
		})
			.then((res) => res.json())
			.then((data) => {
				setLoading(false)

				if (data?.message === 'success') {
					form.reset()
					dialog.setOpen(false)
					reportSuccess.setOpen(true)
				} else {
					setError(true)
				}
			})
			.finally(() => {
				setLoading(false)
			})

		return data
	}

	return (
		<>
			{dataType ? (
				<Tooltip2 content="Report incorrect data">
					<button onClick={dialog.toggle}>
						<Icon name="flag" height={14} width={14} />
					</button>
				</Tooltip2>
			) : (
				<button
					onClick={dialog.toggle}
					style={{ textAlign: 'left', margin: 'auto 0 0 -4px', paddingTop: '24px', textDecoration: 'underline' }}
				>
					Report incorrect data
				</button>
			)}

			<Dialog state={dialog} className="dialog">
				{isLending && (
					<p style={{ textAlign: 'center', color: 'red' }}>
						For lending protocols TVL doesn't include borrowed coins by default
					</p>
				)}
				<DialogForm onSubmit={onSubmit} data-variant="secondary">
					<label>
						<span>Protocol</span>
						<input name="protocol" value={protocol} disabled />
					</label>
					<label>
						<span>Data Type</span>
						{dataType ? (
							<input name="dataType" value={dataType} disabled />
						) : (
							<select name="dataType">
								<option value="TVL">TVL</option>
								<option value="Mcap">Mcap</option>
								<option value="Token Price">Token Price</option>
								<option value="Token Volume">Token Volume</option>
								<option value="Token Liquidity">Token Liquidity</option>
								<option value="FDV">FDV</option>
								<option value="Volume">Volume</option>
								<option value="Fees">Fees</option>
								<option value="Revenue">Revenue</option>
								<option value="Treasury">Treasury</option>
								<option value="Unlocks">Unlocks</option>
								<option value="Active Addresses">Active Addresses</option>
								<option value="New Addresses">New Addresses</option>
								<option value="Transactions">Transactions</option>
								<option value="Gas Used">Gas Used</option>
								<option value="Staking">Staking</option>
								<option value="Borrowed">Borrowed</option>
								<option value="Median APY">Median APY</option>
								<option value="USD Inflows">USD Inflows</option>
								<option value="Governance">Governance</option>
								<option value="Bridge Volume">Bridge Volume</option>
								<option value="Events">Events</option>
								<option value="Raises">Events</option>
							</select>
						)}
					</label>
					<label>
						<span>What's wrong about it? (optional)</span>
						<textarea name="message" />
					</label>
					<label>
						<span>Where can we find correct information? (optional)</span>
						<textarea name="correctSource" />
					</label>
					<FormSubmitBtn name="submit-btn" disabled={loading}>
						Report
					</FormSubmitBtn>
					{error && (
						<small style={{ textAlign: 'center', color: 'red' }}>Something went wrong, couldn't submit report</small>
					)}
				</DialogForm>
			</Dialog>

			<Dialog
				state={reportSuccess}
				className="dialog"
				style={{
					fontSize: '1.125rem',
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					padding: '36px 0'
				}}
			>
				<Icon name="check-circle" height={100} width={100} strokeWidth={0.5} />
				<p>Reported Successfully</p>
			</Dialog>
		</>
	)
}
