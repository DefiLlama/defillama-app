import * as Ariakit from '@ariakit/react'
import { useCallback, useReducer } from 'react'
import { Icon } from '~/components/Icon'
import { useSubscribe } from '~/containers/Subscription/useSubscribe'

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

const FEATURES = ['Unlimited CSV downloads', 'Unlimited data exports', '5 deep research reports per day', 'Custom dashboards & alerts']

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
			className="dialog flex max-h-[85dvh] max-w-sm flex-col overflow-hidden rounded-xl border border-[#39393E] bg-[#1a1b1f] p-0 text-white shadow-2xl max-sm:drawer max-sm:rounded-b-none"
			portal
			unmountOnHide
		>
			<button
				onClick={handleClose}
				className="absolute top-4 right-4 z-20 rounded-full p-1.5 text-[#8a8c90] transition-colors hover:bg-[#39393E] hover:text-white"
			>
				<Icon name="x" height={18} width={18} />
			</button>

			<div className="px-6 pt-8 pb-6">
				<div className="flex flex-col items-center gap-4 text-center">
					<div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#5C5CF9]/15">
						<Icon name="download-paper" height={28} width={28} className="text-[#5C5CF9]" />
					</div>

					{upgraded ? (
						<>
							<div className="space-y-1.5">
								<h3 className="text-lg font-semibold">Upgrade Successful</h3>
							</div>
							<div className="w-full rounded-lg border border-green-500/30 bg-green-500/10 p-4">
								<div className="flex items-start gap-3">
									<Icon name="check" height={20} width={20} className="mt-0.5 shrink-0 text-green-500" />
									<p className="text-left text-sm text-[#c5c5c5]">
										Please wait a few minutes and refresh the page after upgrading, the upgrade might take a few
										minutes to apply.
									</p>
								</div>
							</div>
							<button
								onClick={handleClose}
								className="w-full rounded-lg bg-[#5C5CF9] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#4A4AF0]"
							>
								Close
							</button>
						</>
					) : (
						<>
							<div className="space-y-1.5">
								<h3 className="text-lg font-semibold">CSV Downloads Require Pro</h3>
								<p className="text-sm leading-relaxed text-[#8a8c90]">
									Upgrade to export data from any chart or table across DefiLlama.
								</p>
							</div>

							<div className="w-full rounded-lg bg-[#242529] p-4">
								<p className="mb-2.5 text-left text-xs font-medium tracking-wide text-[#8a8c90] uppercase">
									Included with Pro
								</p>
								<ul className="space-y-2">
									{FEATURES.map((feature) => (
										<li key={feature} className="flex items-center gap-2.5 text-left text-sm text-[#c5c5c7]">
											<Icon name="check" height={14} width={14} className="shrink-0 text-[#5C5CF9]" />
											{feature}
										</li>
									))}
								</ul>
							</div>

							<div className="flex w-full flex-col gap-2.5">
								<button
									onClick={() => {
										void handleUpgrade()
									}}
									disabled={isEndTrialLoading}
									className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#5C5CF9] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#4A4AF0] disabled:cursor-not-allowed disabled:opacity-70"
								>
									<Icon name="sparkles" height={16} width={16} />
									{isEndTrialLoading ? 'Processing...' : 'Upgrade to Pro'}
								</button>
								<a
									href="/subscription"
									className="flex w-full items-center justify-center rounded-lg px-4 py-2 text-sm text-[#8a8c90] transition-colors hover:text-white"
								>
									View all plans
								</a>
							</div>
						</>
					)}
				</div>
			</div>
		</Ariakit.Dialog>
	)
}
