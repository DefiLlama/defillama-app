import * as Ariakit from '@ariakit/react'
import { Icon, type IIcon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { FREE_TIER_MAX_DASHBOARDS } from '../hooks/useFreeTierStatus'

export type PaywallReason = 'dashboard-limit' | 'llamaai' | 'private-dashboard' | 'pro-feature'

interface DashboardPaywallModalProps {
	dialogStore: Ariakit.DialogStore
	reason?: PaywallReason
}

const REASON_CONFIG: Record<PaywallReason, { icon: IIcon['name']; title: string; description: string; features: string[] }> = {
	'dashboard-limit': {
		icon: 'layout-grid',
		title: 'Dashboard Limit Reached',
		description: `Free accounts can create up to ${FREE_TIER_MAX_DASHBOARDS} dashboard${FREE_TIER_MAX_DASHBOARDS === 1 ? '' : 's'}. Upgrade to Pro for unlimited dashboards and more.`,
		features: ['Unlimited dashboards', 'Private dashboards', 'LlamaAI charts & generation', 'Custom columns & Token Usage tables']
	},
	llamaai: {
		icon: 'sparkles',
		title: 'LlamaAI is a Pro Feature',
		description: 'Generate and edit dashboards with AI, add saved LlamaAI charts, and more.',
		features: ['Generate dashboards with AI', 'Edit existing dashboards with AI', 'Add saved LlamaAI charts', 'Unlimited dashboards']
	},
	'private-dashboard': {
		icon: 'key',
		title: 'Private Dashboards Require Pro',
		description: 'Free accounts can only create public dashboards. Upgrade to keep your dashboards private.',
		features: ['Private dashboards', 'Unlimited dashboards', 'LlamaAI charts & generation', 'Custom columns & Token Usage tables']
	},
	'pro-feature': {
		icon: 'file-lock-2',
		title: 'Pro Feature',
		description: 'This feature requires a Pro subscription. Upgrade to unlock the full dashboard experience.',
		features: ['Unlimited dashboards', 'Private dashboards', 'LlamaAI charts & generation', 'Custom columns & Token Usage tables']
	}
}

export function DashboardPaywallModal({ dialogStore, reason = 'pro-feature' }: DashboardPaywallModalProps) {
	const config = REASON_CONFIG[reason]

	return (
		<Ariakit.DialogProvider store={dialogStore}>
			<Ariakit.Dialog
				className="dialog flex max-h-[85dvh] max-w-sm flex-col overflow-hidden rounded-xl border border-[#39393E] bg-[#1a1b1f] p-5 text-white shadow-2xl max-sm:drawer max-sm:rounded-b-none sm:p-6"
				portal
				unmountOnHide
			>
				<Ariakit.DialogDismiss className="ml-auto shrink-0 rounded-full p-1.5 text-[#8a8c90] transition-colors hover:bg-[#39393E] hover:text-white">
					<Icon name="x" height={18} width={18} />
					<span className="sr-only">Close</span>
				</Ariakit.DialogDismiss>

				<div className="flex flex-col items-center gap-4 text-center">
					<div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#5C5CF9]/15">
						<Icon name={config.icon} height={28} width={28} className="text-[#5C5CF9]" />
					</div>

					<div className="space-y-1.5">
						<Ariakit.DialogHeading className="text-lg font-semibold">{config.title}</Ariakit.DialogHeading>
						<p className="text-sm leading-relaxed text-[#8a8c90]">{config.description}</p>
					</div>

					<div className="w-full rounded-lg bg-[#242529] p-4">
						<p className="mb-2.5 text-left text-xs font-medium uppercase tracking-wide text-[#8a8c90]">
							Included with Pro
						</p>
						<ul className="space-y-2">
							{config.features.map((feature) => (
								<li key={feature} className="flex items-center gap-2.5 text-left text-sm text-[#c5c5c7]">
									<Icon name="check" height={14} width={14} className="shrink-0 text-[#5C5CF9]" />
									{feature}
								</li>
							))}
						</ul>
					</div>

					<BasicLink
						href="/subscription"
						data-umami-event="dashboard-paywall-upgrade"
						className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#5C5CF9] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#4A4AF0]"
					>
						<Icon name="sparkles" height={16} width={16} />
						Upgrade to Pro
					</BasicLink>
				</div>
			</Ariakit.Dialog>
		</Ariakit.DialogProvider>
	)
}
