import React from 'react'

type ChartSkeletonProps = {
	minHeight?: string
	width?: string
	className?: string
}

export const ChartSkeleton: React.FC<ChartSkeletonProps> = ({
	minHeight = 'min-h-[480px]',
	width = 'w-full',
	className = ''
}) => (
	<div
		className={`${width} bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse ${minHeight} ${className}`}
		aria-busy="true"
		aria-label="Loading chart area"
	/>
)
