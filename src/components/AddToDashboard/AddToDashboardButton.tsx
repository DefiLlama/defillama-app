import { memo } from 'react'
import * as Ariakit from '@ariakit/react'
import { Icon } from '~/components/Icon'
import { SubscribeProModal } from '~/components/SubscribeCards/SubscribeProCard'
import {
	ChartBuilderConfig,
	MultiChartConfig,
	StablecoinAssetChartConfig,
	StablecoinsChartConfig,
	YieldsChartConfig
} from '~/containers/ProDashboard/types'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { useIsClient } from '~/hooks/useIsClient'
import { AddToDashboardModal } from './AddToDashboardModal'

export type DashboardChartConfig =
	| MultiChartConfig
	| ChartBuilderConfig
	| YieldsChartConfig
	| StablecoinsChartConfig
	| StablecoinAssetChartConfig

export interface LlamaAIChartInput {
	messageId: string
	chartId: string
	title: string
}

interface AddToDashboardButtonProps {
	chartConfig: DashboardChartConfig | null
	multiChart?: MultiChartConfig | null
	llamaAIChart?: LlamaAIChartInput | null
	unsupportedMetrics?: string[]
	variant?: 'button' | 'icon'
	className?: string
	smol?: boolean
	disabled?: boolean
}

export const AddToDashboardButton = memo(function AddToDashboardButton({
	chartConfig,
	multiChart,
	llamaAIChart,
	unsupportedMetrics = [],
	variant = 'button',
	className,
	smol,
	disabled
}: AddToDashboardButtonProps) {
	const dashboardDialogStore = Ariakit.useDialogStore()
	const subscribeDialogStore = Ariakit.useDialogStore()
	const { loaders, isAuthenticated, hasActiveSubscription } = useAuthContext()
	const isClient = useIsClient()

	const config = chartConfig ?? multiChart
	const hasConfig = config || llamaAIChart

	const handleClick = () => {
		if (!hasConfig || disabled) return

		if (hasActiveSubscription && isAuthenticated) {
			dashboardDialogStore.show()
		} else {
			subscribeDialogStore.show()
		}
	}

	const baseClassName = `
		${className} flex items-center justify-center gap-1 rounded-md border border-(--form-control-border) px-2 py-2 text-xs text-(--text-form) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) disabled:opacity-60
	`
	const button = (
		<button
			onClick={handleClick}
			disabled={loaders.userLoading || disabled || !hasConfig}
			className={baseClassName}
			data-umami-event="add-to-dashboard-click"
			title="Add to Pro Dashboard"
		>
			<Icon name="plus" className="h-3 w-3" />
			{!smol && variant === 'button' && <span>Add to Dashboard</span>}
		</button>
	)

	return (
		<>
			{button}
			{isClient && hasConfig && (
				<>
					<AddToDashboardModal
						dialogStore={dashboardDialogStore}
						chartConfig={config ?? null}
						llamaAIChart={llamaAIChart}
						unsupportedMetrics={unsupportedMetrics}
					/>
					<SubscribeProModal dialogStore={subscribeDialogStore} />
				</>
			)}
		</>
	)
})
