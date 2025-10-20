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
	const baseHeight = viewMode === 'grid' ? 'min-h-[220px]' : 'min-h-[156px]'
	return (
		<div
			className={`relative isolate ${baseHeight} overflow-hidden rounded-md border border-(--cards-border) bg-(--cards-bg)`}
			aria-hidden
		>
			<div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0)),radial-gradient(120%_60%_at_0%_0%,transparent,transparent,rgba(255,255,255,0.02))]" />
			<div className="pointer-events-none absolute inset-y-0 -right-1/2 -left-1/2 -translate-x-full animate-[shimmer_1.8s_ease-in-out_infinite] bg-[linear-gradient(-70deg,transparent,rgba(255,255,255,0.12),transparent)] opacity-70 blur-[1.5px]" />
		</div>
	)
}
