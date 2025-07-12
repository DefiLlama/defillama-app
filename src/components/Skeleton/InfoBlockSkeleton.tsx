import React from 'react'

type InfoBlockSkeletonProps = {
	blockWidths?: string[]
	blockHeights?: string[]
	className?: string
	containerClass?: string
}

export const InfoBlockSkeleton: React.FC<InfoBlockSkeletonProps> = ({
	blockWidths = ['w-32', 'w-24', 'w-20', 'w-28'],
	blockHeights = ['h-6', 'h-4', 'h-4', 'h-4'],
	className = '',
	containerClass = 'bg-[var(--cards-bg)] rounded-md p-5'
}) => (
	<div className={`${containerClass} ${className}`} aria-busy="true" aria-label="Loading info block">
		{blockWidths.map((w, i) => (
			<div
				key={i}
				className={`${blockHeights[i] || 'h-4'} bg-neutral-200 dark:bg-neutral-700 rounded ${w} animate-pulse mb-1`}
			/>
		))}
	</div>
)
