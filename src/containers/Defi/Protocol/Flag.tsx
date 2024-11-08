import { useDialogState, Dialog } from 'ariakit/dialog'
import { useState } from 'react'
import { FormSubmitBtn } from '~/components'
import { Icon } from '~/components/Icon'
import { Tooltip } from '~/components/Tooltip'

import { fetchWithErrorLogging } from '~/utils/async'

const fetch = fetchWithErrorLogging

export function Flag({
	protocol,
	dataType,
	isLending,
	className
}: {
	protocol: string
	dataType?: string
	isLending?: boolean
	className?: string
}) {
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
				<Tooltip content="Report incorrect data">
					<button onClick={dialog.toggle} className={className}>
						<Icon name="flag" height={14} width={14} />
					</button>
				</Tooltip>
			) : (
				<button onClick={dialog.toggle} className="text-left mt-auto pt-6 underline">
					Report incorrect data
				</button>
			)}

			{dialog.mounted ? (
				<Dialog state={dialog} className="dialog">
					{isLending && (
						<p style={{ textAlign: 'center', color: 'red' }}>
							For lending protocols TVL doesn't include borrowed coins by default
						</p>
					)}
					<form onSubmit={onSubmit} className="flex flex-col gap-2 p-3 sm:p-0">
						<label className="flex flex-col gap-1">
							<span>Protocol</span>
							<input
								name="protocol"
								value={protocol}
								disabled
								className="p-2 rounded-md bg-white dark:bg-black text-black dark:text-white disabled:opacity-50"
							/>
						</label>
						<label className="flex flex-col gap-1">
							<span>Data Type</span>
							{dataType ? (
								<input
									name="dataType"
									value={dataType}
									disabled
									className="p-2 rounded-md bg-white dark:bg-black text-black dark:text-white disabled:opacity-50"
								/>
							) : (
								<select
									name="dataType"
									className="p-2 rounded-md bg-white dark:bg-black text-black dark:text-white disabled:opacity-50"
								>
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
						<label className="flex flex-col gap-1">
							<span>What's wrong about it? (optional)</span>
							<textarea
								name="message"
								className="p-2 rounded-md bg-white dark:bg-black text-black dark:text-white disabled:opacity-50"
							/>
						</label>
						<label className="flex flex-col gap-1">
							<span>Where can we find correct information? (optional)</span>
							<textarea
								name="correctSource"
								className="p-2 rounded-md bg-white dark:bg-black text-black dark:text-white disabled:opacity-50"
							/>
						</label>
						<FormSubmitBtn name="submit-btn" disabled={loading}>
							Report
						</FormSubmitBtn>
						{error && (
							<small style={{ textAlign: 'center', color: 'red' }}>Something went wrong, couldn't submit report</small>
						)}
					</form>
				</Dialog>
			) : null}

			{reportSuccess.mounted ? (
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
			) : null}
		</>
	)
}
