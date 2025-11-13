interface SkeletonCellProps {
	isLoading?: boolean
	widthClassName?: string
}

export function SkeletonCell({ isLoading = true, widthClassName = 'w-16' }: SkeletonCellProps) {
	if (!isLoading) {
		return <span className="pro-text3">-</span>
	}

	return (
		<span
			className={`inline-flex h-4 ${widthClassName} animate-pulse rounded-full bg-gradient-to-r from-(--cards-bg) via-(--bg-secondary) to-(--cards-bg)`}
		/>
	)
}

