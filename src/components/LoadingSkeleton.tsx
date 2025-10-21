interface LoadingSkeletonProps {
	viewMode?: 'grid' | 'list'
	items?: number
}

export function LoadingSkeleton({ viewMode = 'grid', items = 18 }: LoadingSkeletonProps) {
	return (
		<>
			<div
				className={
					viewMode === 'grid' ? 'grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4' : 'space-y-4'
				}
				role="status"
				aria-live="polite"
				aria-busy="true"
			>
				{Array.from({ length: items }).map((_, i) => (
					<SkeletonCard key={`skeleton-item-${i}`} viewMode={viewMode} />
				))}
			</div>
		</>
	)
}

const SkeletonCard = ({ viewMode }: { viewMode: 'grid' | 'list' }) => {
	return (
		<div
			className={`relative isolate ${viewMode === 'grid' ? 'min-h-[220px]' : 'min-h-[156px]'} overflow-hidden rounded-md border border-(--cards-border) bg-(--cards-bg)`}
			aria-hidden
		>
			<div className="animate-shimmer pointer-events-none absolute inset-y-0 -right-1/2 -left-1/2 bg-[linear-gradient(99.97deg,transparent,rgba(0,0,0,0.08),transparent)] dark:bg-[linear-gradient(99.97deg,transparent,rgba(255,255,255,0.08),transparent)]" />
		</div>
	)
}
