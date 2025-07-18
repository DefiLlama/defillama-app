import { usePullToRefresh } from '~/hooks/usePullToRefresh'

interface PullToRefreshProps {
	onRefresh: () => Promise<void> | void
	children: React.ReactNode
	enabled?: boolean
	className?: string
	threshold?: number
}

export function PullToRefresh({
	onRefresh,
	children,
	enabled = true,
	className = '',
	threshold = 80
}: PullToRefreshProps) {
	const { elementRef, RefreshIndicator, isRefreshing } = usePullToRefresh({
		onRefresh,
		enabled,
		threshold
	})
	
	return (
		<div
			ref={elementRef}
			className={`relative overflow-auto ${className}`}
			style={{ WebkitOverflowScrolling: 'touch' }}
		>
			<RefreshIndicator />
			{children}
		</div>
	)
}