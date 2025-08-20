import { useState } from 'react'
import { useRouter } from 'next/router'
import { Icon } from '~/components/Icon'
import { Tooltip } from '~/components/Tooltip'
import { SubscribeModal } from '~/components/Modal/SubscribeModal'
import { SubscribePlusCard } from '~/components/SubscribeCards/SubscribePlusCard'
import { useSubscribe } from '~/hooks/useSubscribe'
import { useDashboardCreation } from '~/hooks/useDashboardCreation'
import { useIsClient } from '~/hooks'
import { TMetric } from '~/components/Metrics'

interface FullOldViewButtonProps {
	type: TMetric
	className?: string
}

const SUPPORTED_TYPES = [
	'DEX Volume',
	'Perp Volume',
	'Options Premium Volume',
	'Options Notional Volume',
	'DEX Aggregator Volume',
	'Bridge Aggregator Volume'
]

export const FullOldViewButton = ({ type, className }: FullOldViewButtonProps) => {
	const router = useRouter()
	const { createDashboardWithDataset, isAuthenticated, isLoading } = useDashboardCreation()
	const { subscription, isSubscriptionLoading } = useSubscribe()
	const [showSubscribeModal, setShowSubscribeModal] = useState(false)
	const isClient = useIsClient()

	if (!SUPPORTED_TYPES.includes(type)) {
		return null
	}

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
			<Tooltip content={tooltipContent}>
				<button
					onClick={handleClick}
					disabled={isLoading || isSubscriptionLoading}
					className={
						className ||
						'flex cursor-pointer items-center gap-2 rounded-md border border-(--form-control-border) p-2 text-xs font-medium text-(--text-form) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) disabled:cursor-not-allowed disabled:opacity-50'
					}
				>
					{isClient && (isLoading || isSubscriptionLoading) ? (
						<svg
							className="h-[14px] w-[14px] animate-spin"
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
						>
							<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
							<path
								className="opacity-75"
								fill="currentColor"
								d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
							></path>
						</svg>
					) : (
						<>
							<Icon name="plus" height={14} width={14} />
							<span>Open in Dashboard</span>
						</>
					)}
				</button>
			</Tooltip>
			{isClient && (
				<SubscribeModal isOpen={showSubscribeModal} onClose={() => setShowSubscribeModal(false)}>
					<SubscribePlusCard context="modal" returnUrl={router.asPath} />
				</SubscribeModal>
			)}
		</>
	)
}
