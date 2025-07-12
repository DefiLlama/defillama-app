import React from 'react'

type RiskRatingSkeletonProps = {
	count?: number
	className?: string
	circleSize?: string
	blockWidth?: string
	blockHeight?: string
}

export const RiskRatingSkeleton: React.FC<RiskRatingSkeletonProps> = ({
	count = 3,
	className = '',
	circleSize = 'w-7 h-7',
	blockWidth = 'w-20',
	blockHeight = 'h-6'
}) => (
	<div className={`flex flex-col gap-3 w-full ${className}`} aria-busy="true" aria-label="Loading risk rating block">
		<div className="flex items-center gap-2 flex-nowrap">
			<div className={`${circleSize} rounded-full bg-neutral-200 dark:bg-neutral-700 animate-pulse`} />
			<div className="h-6 bg-neutral-200 dark:bg-neutral-700 rounded w-32 animate-pulse" />
		</div>
		{Array.from({ length: count }).map((_, i) => (
			<div key={i} className="flex items-center gap-2">
				<div className={`${blockWidth} rounded-xl bg-neutral-200 dark:bg-neutral-700 ${blockHeight} animate-pulse`} />
				<div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-20 animate-pulse" />
			</div>
		))}
	</div>
)
