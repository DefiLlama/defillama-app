import * as Ariakit from '@ariakit/react'
import { useCallback, useState } from 'react'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { useAuthContext } from '~/containers/Subscription/auth'
import { useSubscribe } from '~/containers/Subscription/useSubscribe'

interface ResearchLimitModalProps {
	dialogStore: Ariakit.DialogStore
	period: string
	limit: number
	resetTime: string | null
}

export function ResearchLimitModal({ dialogStore, period, limit, resetTime: _resetTime }: ResearchLimitModalProps) {
	const isLifetime = period === 'lifetime'
	const { isTrial } = useAuthContext()
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

	const resetUpgradeState = useCallback(() => {
		setUpgraded(false)
	}, [])

	const handleClose = useCallback(() => {
		resetUpgradeState()
		dialogStore.hide()
	}, [dialogStore, resetUpgradeState])

	return (
		<Ariakit.DialogProvider store={dialogStore}>
			<Ariakit.Dialog
				onClose={resetUpgradeState}
				className="dialog fixed inset-0 z-50 m-auto h-fit w-full max-w-md overflow-hidden rounded-2xl border border-[#E6E6E6] bg-[#FFFFFF] p-0 shadow-xl dark:border-[#39393E] dark:bg-[#222429]"
				backdrop={<div className="backdrop fixed inset-0 bg-black/60 backdrop-blur-sm" />}
				portal
				unmountOnHide
			>
				<button
					type="button"
					onClick={handleClose}
					className="absolute top-4 right-4 z-20 rounded-full p-1.5 text-[#666] transition-colors hover:bg-[#f7f7f7] hover:text-black dark:text-gray-400 dark:hover:bg-gray-700/50 dark:hover:text-white"
				>
					<Icon name="x" className="h-5 w-5" />
				</button>

				<div className="relative z-10 px-8 py-10">
					<div className="mb-6 flex justify-center">
						<div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#FFF3E0] dark:bg-[#3D2F1F]">
							<Icon name="circle-x" height={32} width={32} className="text-[#FF9800]" />
						</div>
					</div>

					{upgraded ? (
						<>
							<h2 className="mb-4 text-center text-xl leading-snug font-bold text-black dark:text-white">
								Upgrade Successful
							</h2>
							<div className="mb-6 rounded-lg border border-green-500/30 bg-green-500/10 p-4">
								<div className="flex items-start gap-3">
									<Icon name="check" height={20} width={20} className="mt-0.5 shrink-0 text-green-500" />
									<p className="text-sm text-[#666] dark:text-[#c5c5c5]">
										Please wait a few minutes and refresh the page after upgrading, the upgrade might take a few minutes
										to apply.
									</p>
								</div>
							</div>
							<button
								onClick={handleClose}
								className="w-full rounded-lg bg-[#5C5CF9] px-6 py-3.5 text-center text-base font-semibold text-white transition-colors hover:bg-[#4A4AF0]"
							>
								Close
							</button>
						</>
					) : (
						<>
							<h2 className="mb-4 text-center text-xl leading-snug font-bold text-black dark:text-white">
								Research Report Limit Reached
							</h2>
							<p className="mb-6 text-center text-base leading-6 text-[#666] dark:text-[#919296]">
								{isLifetime
									? `You've used all ${limit} research reports available on your trial plan.`
									: `You've used all ${limit} research reports for today. Resets at midnight UTC.`}
							</p>

							{isTrial ? (
								<div className="flex flex-col gap-3">
									<button
										onClick={() => {
											void handleUpgrade()
										}}
										disabled={isEndTrialLoading}
										className="w-full rounded-lg bg-[#5C5CF9] px-6 py-3.5 text-center text-base font-semibold text-white transition-colors hover:bg-[#4A4AF0] disabled:cursor-not-allowed disabled:opacity-70"
									>
										{isEndTrialLoading ? 'Processing...' : 'Upgrade to Pro'}
									</button>
									<p className="text-center text-sm text-[#888] dark:text-[#777]">
										Get 5 research reports per day with Pro
									</p>
								</div>
							) : (
								<>
									<BasicLink
										href="/subscription"
										data-umami-event="subscribe-research-limit-upgrade"
										className="mx-auto flex w-full items-center justify-center gap-2 rounded-lg bg-[#5C5CF9] px-6 py-3.5 text-center text-base font-semibold text-white transition-colors hover:bg-[#4A4AF0]"
										onClick={dialogStore.hide}
									>
										Upgrade to Pro
									</BasicLink>
									<p className="mt-4 text-center text-sm text-[#888] dark:text-[#777]">
										Get 5 research reports per day with Pro
									</p>
								</>
							)}
						</>
					)}
				</div>
			</Ariakit.Dialog>
		</Ariakit.DialogProvider>
	)
}
