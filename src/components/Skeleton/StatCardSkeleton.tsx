import React from 'react'

type StatCardSkeletonProps = {
	width?: string
	numberHeight?: string
	labelHeight?: string
	className?: string
}

export const StatCardSkeleton: React.FC<StatCardSkeletonProps> = ({
	width = 'max-w-[120px]',
	numberHeight = 'min-h-8 h-8',
	labelHeight = 'h-4',
	className = ''
}) => (
	<div className={`flex flex-col gap-1 w-full ${width} ${className}`} aria-busy="true" aria-label="Loading stat card">
		<div className={`${labelHeight} bg-neutral-200 dark:bg-neutral-700 rounded w-16 animate-pulse`} />
		<div className={`${numberHeight} bg-neutral-200 dark:bg-neutral-700 rounded w-20 animate-pulse`} />
	</div>
)
