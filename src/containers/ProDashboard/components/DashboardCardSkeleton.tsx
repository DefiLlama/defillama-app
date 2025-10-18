interface DashboardCardSkeletonProps {
	viewMode?: 'grid' | 'list'
}

export function DashboardCardSkeleton({ viewMode = 'grid' }: DashboardCardSkeletonProps) {
	return (
		<div
			className={`relative isolate flex ${viewMode === 'grid' ? 'min-h-[220px]' : ''} animate-pulse flex-col gap-1 rounded-md border border-(--cards-border) bg-(--cards-bg) p-2.5`}
		>
			<div className="flex flex-wrap items-center justify-end gap-2">
				<div className="mr-auto h-5 w-2/5 rounded bg-(--cards-border)" />
				{viewMode !== 'grid' && (
					<div className="flex max-w-[60%] flex-wrap items-center gap-1">
						<div className="h-5 w-14 rounded-full bg-(--cards-border)" />
						<div className="h-5 w-12 rounded-full bg-(--cards-border)" />
					</div>
				)}
			</div>

			{viewMode === 'grid' && (
				<div className="flex max-w-[60%] flex-wrap items-center gap-1">
					<div className="h-5 w-14 rounded-full bg-(--cards-border)" />
					<div className="h-5 w-12 rounded-full bg-(--cards-border)" />
				</div>
			)}

			<div className="mt-1 space-y-1.5">
				<div className="h-3 w-4/5 rounded bg-(--cards-border)" />
				<div className="h-3 w-3/5 rounded bg-(--cards-border)" />
			</div>

			<div className={`flex flex-col ${viewMode === 'grid' ? 'mt-5' : 'mt-2'} gap-1`}>
				<div className="flex items-center gap-1">
					<div className="h-3 w-16 rounded bg-(--cards-border)" />
				</div>
				<div className="h-2.5 w-2/5 rounded bg-(--cards-border)" />
			</div>

			<div className={`mt-auto flex items-center justify-between gap-2 ${viewMode === 'grid' ? 'pt-5' : 'pt-2'}`}>
				<div className="flex items-center gap-3">
					<div className="h-3 w-10 rounded bg-(--cards-border)" />
					<div className="h-3 w-10 rounded bg-(--cards-border)" />
				</div>
				<div className="h-2.5 w-24 rounded bg-(--cards-border)" />
			</div>
		</div>
	)
}
