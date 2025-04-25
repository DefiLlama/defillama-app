import { useState } from 'react'
import { Icon } from '~/components/Icon'
import { Tooltip } from '~/components/Tooltip'
import * as Ariakit from '@ariakit/react'
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

	const dialogStore = Ariakit.useDialogStore()
	const successDialogStore = Ariakit.useDialogStore()

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
					dialogStore.setOpen(false)
					successDialogStore.setOpen(true)
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
				<Tooltip content="Report incorrect data" render={<button />} onClick={dialogStore.toggle} className={className}>
					<Icon name="flag" height={14} width={14} />
				</Tooltip>
			) : (
				<button className="text-left mt-auto pt-6 underline" onClick={dialogStore.toggle}>
					Report incorrect data
				</button>
			)}

			<Ariakit.Dialog className="dialog" unmountOnHide store={dialogStore}>
				{isLending && (
					<p className="text-center text-red-500">
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
							className="p-2 rounded-md bg-white dark:bg-black text-black dark:text-white disabled:opacity-50 border border-[var(--form-control-border)]"
						/>
					</label>
					<label className="flex flex-col gap-1">
						<span>Data Type</span>
						{dataType ? (
							<input
								name="dataType"
								value={dataType}
								disabled
								className="p-2 rounded-md bg-white dark:bg-black text-black dark:text-white disabled:opacity-50 border border-[var(--form-control-border)]"
							/>
						) : (
							<select
								name="dataType"
								className="p-2 rounded-md bg-white dark:bg-black text-black dark:text-white disabled:opacity-50 border border-[var(--form-control-border)]"
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
						<span>What's wrong about it?</span>
						<textarea
							name="message"
							required
							className="p-2 rounded-md bg-white dark:bg-black text-black dark:text-white disabled:opacity-50 border border-[var(--form-control-border)]"
						/>
					</label>
					<label className="flex flex-col gap-1">
						<span>Where can we find correct information? (optional)</span>
						<textarea
							name="correctSource"
							className="p-2 rounded-md bg-white dark:bg-black text-black dark:text-white disabled:opacity-50 border border-[var(--form-control-border)]"
						/>
					</label>
					<button
						name="submit-btn"
						disabled={loading}
						className="p-3 mt-3 bg-[#2172e5] text-white rounded-md hover:bg-[#4190ff] focus-visible:bg-[#4190ff] disabled:opacity-50"
					>
						Report
					</button>
					{error && <small className="text-center text-red-500">Something went wrong, couldn't submit report</small>}
				</form>
			</Ariakit.Dialog>

			<Ariakit.Dialog
				className="dialog text-lg flex flex-col items-center py-9 px-0"
				unmountOnHide
				store={successDialogStore}
			>
				<Icon name="check-circle" height={100} width={100} strokeWidth={0.5} />
				<p>Reported Successfully</p>
			</Ariakit.Dialog>
		</>
	)
}
