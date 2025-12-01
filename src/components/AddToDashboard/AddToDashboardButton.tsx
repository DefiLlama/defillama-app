import { memo } from 'react'
import * as Ariakit from '@ariakit/react'
import { Icon } from '~/components/Icon'
import { SubscribeProModal } from '~/components/SubscribeCards/SubscribeProCard'
import { ChartBuilderConfig, MultiChartConfig } from '~/containers/ProDashboard/types'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { useIsClient } from '~/hooks'
import { useSubscribe } from '~/hooks/useSubscribe'
import { AddToDashboardModal } from './AddToDashboardModal'

export type DashboardChartConfig = MultiChartConfig | ChartBuilderConfig

interface AddToDashboardButtonProps {
	chartConfig: DashboardChartConfig | null
	multiChart?: MultiChartConfig | null
	unsupportedMetrics?: string[]
	variant?: 'button' | 'icon'
	className?: string
	smol?: boolean
	disabled?: boolean
}

export const AddToDashboardButton = memo(function AddToDashboardButton({
	chartConfig,
	multiChart,
	unsupportedMetrics = [],
	variant = 'button',
	className,
	smol,
	disabled
}: AddToDashboardButtonProps) {
	const dashboardDialogStore = Ariakit.useDialogStore()
	const subscribeDialogStore = Ariakit.useDialogStore()
	const { subscription, isSubscriptionLoading } = useSubscribe()
	const { loaders, isAuthenticated } = useAuthContext()
	const isClient = useIsClient()

	const config = chartConfig ?? multiChart

	const isLoading = loaders.userLoading || isSubscriptionLoading

	const hasActiveSubscription = subscription?.status === 'active'

	const handleClick = () => {
		if (!config || disabled) return

		if (!isLoading && hasActiveSubscription && isAuthenticated) {
			dashboardDialogStore.show()
		} else if (!isLoading) {
			subscribeDialogStore.show()
		}
	}

	const baseClassName = `
		${className} flex items-center justify-center gap-1 rounded-md border border-(--form-control-border) px-2 py-2 text-xs text-(--text-form) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) disabled:opacity-60
	`
	return (
		<>
			<button
				onClick={handleClick}
				disabled={isLoading || disabled || !config}
				className={baseClassName}
				data-umami-event="add-to-dashboard-click"
			>
				<Icon name="plus" className="h-3 w-3" />
				{!smol && variant === 'button' && <span>Add to Dashboard</span>}
			</button>

			{isClient && config && (
				<>
					<AddToDashboardModal
						dialogStore={dashboardDialogStore}
						chartConfig={config}
						unsupportedMetrics={unsupportedMetrics}
					/>
					<SubscribeProModal dialogStore={subscribeDialogStore} />
				</>
			)}
		</>
	)
})
