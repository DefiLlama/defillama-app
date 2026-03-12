import { useCallback, useState } from 'react'
import * as Ariakit from '@ariakit/react'
import { Icon } from '~/components/Icon'
import { useSubscribe } from '~/containers/Subscribtion/useSubscribe'

interface TokenLimitModalProps {
	isOpen: boolean
	onClose: () => void
}

export function TokenLimitModal({ isOpen, onClose }: TokenLimitModalProps) {
	const { endTrialSubscription, isEndTrialLoading } = useSubscribe()
	const [upgraded, setUpgraded] = useState(false)

	const handleUpgrade = useCallback(async () => {
		try {
			await endTrialSubscription()
			setUpgraded(true)
		} catch (error) {
			console.error('Failed to upgrade:', error)
		}
	}, [endTrialSubscription])

	const handleClose = useCallback(() => {
		setUpgraded(false)
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
				<h3 className="text-xl font-bold">{upgraded ? 'Upgrade Successful' : 'Daily Usage Limit Reached'}</h3>
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
								<p className="font-semibold text-yellow-500">Daily AI usage limit reached</p>
								<p className="text-sm text-[#c5c5c5]">
									You've reached your daily AI usage limit on the trial plan. Upgrade to a full subscription ($49/month)
									for unlimited access.
								</p>
							</div>
						</div>
					</div>
					<div className="mt-2 flex flex-col gap-2">
						<p className="text-sm text-[#8a8c90]">Full subscription includes:</p>
						<ul className="flex flex-col gap-1 text-sm">
							<li className="flex items-center gap-2">
								<Icon name="check" height={14} width={14} className="text-green-400" />
								<span>Unlimited AI questions</span>
							</li>
							<li className="flex items-center gap-2">
								<Icon name="check" height={14} width={14} className="text-green-400" />
								<span>Deep research: 5/day (instead of 3)</span>
							</li>
							<li className="flex items-center gap-2">
								<Icon name="check" height={14} width={14} className="text-green-400" />
								<span>CSV Downloads - export any dataset</span>
							</li>
							<li className="flex items-center gap-2">
								<Icon name="check" height={14} width={14} className="text-green-400" />
								<span>DefiLlama Pro Dashboards</span>
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
