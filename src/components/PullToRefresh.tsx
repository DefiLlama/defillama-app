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
	
	console.log('PullToRefresh rendered, enabled:', enabled)
	
	return (
		<div
			ref={elementRef}
			className={`relative overflow-auto ${className}`}
			style={{ 
				WebkitOverflowScrolling: 'touch',
				touchAction: 'manipulation',
				height: '100%',
				minHeight: '100vh'
			}}
			onTouchStart={(e) => console.log('React touch start detected')}
			onMouseDown={(e) => console.log('React mouse down detected')}
			onClick={(e) => console.log('React click detected')}
		>
			<RefreshIndicator />
			{children}
		</div>
	)
}