import { useRouter } from 'next/router'

export function ResetAllYieldFilters({
	pathname,
	resetContext,
	nestedMenu
}: {
	pathname: string
	resetContext?: () => void
	nestedMenu: boolean
}) {
	const router = useRouter()

	const handleClick = () => {
		router.push(pathname, undefined, { shallow: true })
		resetContext?.()
	}

	// Check if any filters are active
	const hasActiveFilters = Object.keys(router.query).length > 0

	return (
		<button
			onClick={handleClick}
			disabled={!hasActiveFilters}
			className={`rounded-md px-3 py-2 md:text-xs ${
				nestedMenu ? 'text-left' : 'bg-(--btn-bg) hover:bg-(--btn-hover-bg) focus-visible:bg-(--btn-hover-bg)'
			} disabled:cursor-not-allowed disabled:opacity-40`}
		>
			Reset all filters
		</button>
	)
}
