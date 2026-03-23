import * as Ariakit from '@ariakit/react'
import { useState, type ReactNode } from 'react'
import { Icon } from '~/components/Icon'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { setSignupSource } from '~/containers/Subscribtion/signupSource'
import { DashboardPaywallModal, type PaywallReason } from './DashboardPaywallModal'

interface PremiumFeatureGateProps {
	featureName: string
	paywallReason?: PaywallReason
	children: ReactNode
}

export function PremiumFeatureGate({ featureName, paywallReason = 'pro-feature', children }: PremiumFeatureGateProps) {
	const { hasActiveSubscription } = useAuthContext()
	const [paywallOpen, setPaywallOpen] = useState(false)
	const paywallDialogStore = Ariakit.useDialogStore({ open: paywallOpen, setOpen: setPaywallOpen })

	if (hasActiveSubscription) {
		return <>{children}</>
	}

	return (
		<>
			<div className="flex min-h-[300px] flex-col items-center justify-center gap-4 p-6 text-center">
				<div className="flex h-12 w-12 items-center justify-center rounded-full bg-(--primary)/10">
					<Icon name="file-lock-2" height={24} width={24} className="text-(--primary)" />
				</div>
				<div className="space-y-2">
					<h3 className="text-lg font-semibold pro-text1">{featureName}</h3>
					<p className="max-w-sm text-sm pro-text2">This feature requires a Pro subscription. Upgrade to unlock it.</p>
				</div>
				<button
					onClick={() => {
						setSignupSource('pro-dashboard')
						setPaywallOpen(true)
					}}
					className="flex items-center gap-2 rounded-md pro-btn-blue px-6 py-2.5 text-sm font-medium transition-opacity hover:opacity-90"
				>
					<Icon name="sparkles" height={16} width={16} />
					Upgrade to Pro
				</button>
			</div>

			{paywallOpen ? <DashboardPaywallModal dialogStore={paywallDialogStore} reason={paywallReason} /> : null}
		</>
	)
}
