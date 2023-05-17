import { useDialogState, Dialog } from 'ariakit/dialog'
import { useState } from 'react'
import { Flag as FlagIcon } from 'react-feather'
import { FormSubmitBtn } from '~/components'
import { DialogForm } from '~/components/Filters/common/Base'
import { Tooltip2 } from '~/components/Tooltip'

export function Flag({ protocol, dataType, isLending }: { protocol: string; dataType?: string; isLending?: boolean }) {
	const [loading, setLoading] = useState(false)
	const dialog = useDialogState()

	const onSubmit = async (e) => {
		e.preventDefault()
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
		}).finally(() => {
			setLoading(false)
			dialog.setOpen(false)
		})

		return data
	}

	return (
		<>
			{dataType ? (
				<Tooltip2 content="Report incorrect data">
					<button onClick={dialog.toggle}>
						<FlagIcon size={14} />
					</button>
				</Tooltip2>
			) : (
				<button
					onClick={dialog.toggle}
					style={{ textAlign: 'left', margin: 'auto 0 0 -4px', textDecoration: 'underline' }}
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
								<option value="Unlocks">Unlocks</option>
								<option value="Active Users">Active Users</option>
								<option value="New Users">New Users</option>
								<option value="Transactions">Transactions</option>
								<option value="Gas Used">Gas Used</option>
								<option value="Staking">Staking</option>
								<option value="Borrowed">Borrowed</option>
								<option value="Median APY">Median APY</option>
								<option value="USD Inflows">USD Inflows</option>
								<option value="Governance">Governance</option>
								<option value="Bridge Volume">Bridge Volume</option>
								<option value="Events">Events</option>
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
				</DialogForm>
			</Dialog>
		</>
	)
}
