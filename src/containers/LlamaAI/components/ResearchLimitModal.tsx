import * as Ariakit from '@ariakit/react'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'

interface ResearchLimitModalProps {
	dialogStore: Ariakit.DialogStore
	period: string
	limit: number
	resetTime: string | null
}

export function ResearchLimitModal({ dialogStore, period, limit, resetTime: _resetTime }: ResearchLimitModalProps) {
	const isLifetime = period === 'lifetime'

	return (
		<Ariakit.DialogProvider store={dialogStore}>
			<Ariakit.Dialog
				className="dialog fixed inset-0 z-50 m-auto h-fit w-full max-w-md overflow-hidden rounded-2xl border border-[#E6E6E6] bg-[#FFFFFF] p-0 shadow-xl dark:border-[#39393E] dark:bg-[#222429]"
				backdrop={<div className="backdrop fixed inset-0 bg-black/60 backdrop-blur-sm" />}
				portal
				unmountOnHide
			>
				<Ariakit.DialogDismiss className="absolute top-4 right-4 z-20 rounded-full p-1.5 text-[#666] transition-colors hover:bg-[#f7f7f7] hover:text-black dark:text-gray-400 dark:hover:bg-gray-700/50 dark:hover:text-white">
					<Icon name="x" className="h-5 w-5" />
				</Ariakit.DialogDismiss>

				<div className="relative z-10 px-8 py-10">
					<div className="mb-6 flex justify-center">
						<div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#FFF3E0] dark:bg-[#3D2F1F]">
							<Icon name="circle-x" height={32} width={32} className="text-[#FF9800]" />
						</div>
					</div>

					<h2 className="mb-4 text-center text-xl leading-snug font-bold text-black dark:text-white">
						Research Report Limit Reached
					</h2>
					<p className="mb-6 text-center text-base leading-6 text-[#666] dark:text-[#919296]">
						{isLifetime
							? `You've used all ${limit} research reports available on your trial plan.`
							: `You've used all ${limit} research reports for today. Resets at midnight UTC.`}
					</p>

					<BasicLink
						href="/subscription"
						data-umami-event="research-limit-upgrade"
						className="mx-auto flex w-full items-center justify-center gap-2 rounded-lg bg-[#5C5CF9] px-6 py-3.5 text-center text-base font-semibold text-white transition-colors hover:bg-[#4A4AF0]"
						onClick={dialogStore.hide}
					>
						Upgrade to Pro
					</BasicLink>

					<p className="mt-4 text-center text-sm text-[#888] dark:text-[#777]">
						{isLifetime ? 'Get 5 reports per day with Pro' : 'Need more? Contact us for custom limits'}
					</p>
				</div>
			</Ariakit.Dialog>
		</Ariakit.DialogProvider>
	)
}
