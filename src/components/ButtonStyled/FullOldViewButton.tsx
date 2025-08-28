import { useState } from 'react'
import { useRouter } from 'next/router'
import { Icon } from '~/components/Icon'
import { LoadingSpinner } from '~/components/Loaders'
import { SubscribeModal } from '~/components/Modal/SubscribeModal'
import { SubscribePlusCard } from '~/components/SubscribeCards/SubscribePlusCard'
import { Tooltip } from '~/components/Tooltip'
import { useIsClient } from '~/hooks'
import { useDashboardCreation } from '~/hooks/useDashboardCreation'
import { useSubscribe } from '~/hooks/useSubscribe'

export const FullOldViewButton = () => {
	const router = useRouter()
	const { createDashboardWithDataset, isAuthenticated, isLoading } = useDashboardCreation()
	const { subscription, isSubscriptionLoading } = useSubscribe()
	const [showSubscribeModal, setShowSubscribeModal] = useState(false)
	const isClient = useIsClient()

	const handleClick = () => {
		if (isLoading || isSubscriptionLoading) return

		if (isAuthenticated && subscription?.status === 'active') {
			createDashboardWithDataset()
		} else {
			setShowSubscribeModal(true)
		}
	}

	const tooltipContent = (
		<div className="space-y-1 text-xs">
			<p className="font-semibold">Full View includes:</p>
			<ul className="list-inside list-disc pl-2">
				<li>Protocol Name & Logo</li>
				<li>24h Volume</li>
				<li>7d Volume</li>
				<li>30d Volume</li>
				<li>24h Change %</li>
				<li>7d Change %</li>
				<li>% of Total</li>
				<li>CSV Download</li>
			</ul>
		</div>
	)

	return (
		<>
			<Tooltip
				content={tooltipContent}
				render={<button onClick={handleClick} disabled={isLoading || isSubscriptionLoading} />}
				className="flex cursor-pointer items-center gap-2 rounded-md border border-(--form-control-border) px-2 py-1.5 text-xs font-medium text-(--text-form) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) disabled:cursor-not-allowed disabled:opacity-50"
			>
				{isClient && (isLoading || isSubscriptionLoading) ? (
					<LoadingSpinner size={14} />
				) : (
					<Icon name="plus" height={14} width={14} />
				)}
				<span>Open in Dashboard</span>
			</Tooltip>
			{isClient && (
				<SubscribeModal isOpen={showSubscribeModal} onClose={() => setShowSubscribeModal(false)}>
					<SubscribePlusCard context="modal" returnUrl={router.asPath} />
				</SubscribeModal>
			)}
		</>
	)
}
