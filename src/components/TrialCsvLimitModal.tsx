import * as Ariakit from '@ariakit/react'
import { useCallback, useReducer } from 'react'
import { Icon } from '~/components/Icon'
import { useSubscribe } from '~/containers/Subscribtion/useSubscribe'

interface State {
	upgraded: boolean
}

type Action = { type: 'setUpgraded'; value: boolean } | { type: 'reset' }

const initialState: State = { upgraded: false }

function reducer(state: State, action: Action): State {
	switch (action.type) {
		case 'setUpgraded':
			return { upgraded: action.value }
		case 'reset':
			return initialState
		default:
			return state
	}
}

export function TrialCsvLimitModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
	const { endTrialSubscription, isEndTrialLoading } = useSubscribe()
	const [state, dispatch] = useReducer(reducer, initialState)
	const { upgraded } = state

	const handleUpgrade = useCallback(async () => {
		try {
			await endTrialSubscription()
			dispatch({ type: 'setUpgraded', value: true })
		} catch (error) {
			console.error('Failed to upgrade:', error)
		}
	}, [endTrialSubscription])

	const handleClose = useCallback(() => {
		dispatch({ type: 'reset' })
		onClose()
	}, [onClose])

	return (
		<Ariakit.Dialog
			open={isOpen}
			onClose={handleClose}
			className="dialog flex max-h-[90dvh] max-w-md flex-col gap-4 overflow-y-auto rounded-xl border border-[#39393E] bg-[#1a1b1f] p-6 text-white shadow-2xl max-sm:drawer max-sm:rounded-b-none"
			portal
			unmountOnHide
		>
			<div className="flex items-center justify-between">
				<h3 className="text-xl font-bold">{upgraded ? 'Upgrade Successful' : 'Upgrade to Full Access'}</h3>
				<button
					onClick={handleClose}
					className="rounded-full p-1.5 text-[#8a8c90] transition-colors hover:bg-[#39393E] hover:text-white"
				>
					<Icon name="x" height={18} width={18} />
				</button>
			</div>
			{upgraded ? (
				<>
					<div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4">
						<div className="flex items-start gap-3">
							<Icon name="check" height={20} width={20} className="mt-0.5 shrink-0 text-green-500" />
							<p className="text-sm text-[#c5c5c5]">
								Please wait a few minutes and refresh the page after upgrading, the upgrade might take a few minutes to
								apply.
							</p>
						</div>
					</div>
					<button
						onClick={handleClose}
						className="w-full rounded-lg bg-[#5C5CF9] px-4 py-3 font-medium text-white transition-colors hover:bg-[#4A4AF0]"
					>
						Close
					</button>
				</>
			) : (
				<>
					<div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
						<div className="flex items-start gap-3">
							<Icon name="alert-triangle" height={20} width={20} className="mt-0.5 shrink-0 text-yellow-500" />
							<div className="flex flex-col gap-2">
								<p className="font-semibold text-yellow-500">CSV download limit reached</p>
								<p className="text-sm text-[#c5c5c5]">
									Trial accounts are limited to 1 CSV download. To download more CSVs, upgrade to a full subscription
									($49/month).
								</p>
							</div>
						</div>
					</div>
					<div className="mt-2 flex flex-col gap-2">
						<p className="text-sm text-[#8a8c90]">Benefits of upgrading:</p>
						<ul className="flex flex-col gap-1 text-sm">
							<li className="flex items-center gap-2">
								<Icon name="check" height={14} width={14} className="text-green-400" />
								<span>Unlimited CSV downloads</span>
							</li>
							<li className="flex items-center gap-2">
								<Icon name="check" height={14} width={14} className="text-green-400" />
								<span>5 deep research questions per day (instead of 3)</span>
							</li>
							<li className="flex items-center gap-2">
								<Icon name="check" height={14} width={14} className="text-green-400" />
								<span>All Pro features without limitations</span>
							</li>
						</ul>
					</div>
					<div className="mt-2 flex flex-col gap-3">
						<button
							onClick={() => {
								void handleUpgrade()
							}}
							disabled={isEndTrialLoading}
							className="w-full rounded-lg bg-[#5C5CF9] px-4 py-3 font-medium text-white transition-colors hover:bg-[#4A4AF0] disabled:cursor-not-allowed disabled:opacity-70"
						>
							{isEndTrialLoading ? 'Processing...' : 'Upgrade Now'}
						</button>
						<button
							onClick={onClose}
							disabled={isEndTrialLoading}
							className="w-full rounded-lg border border-[#39393E] px-4 py-2 text-[#8a8c90] transition-colors hover:bg-[#2a2b30] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
						>
							Close
						</button>
					</div>
				</>
			)}
		</Ariakit.Dialog>
	)
}
