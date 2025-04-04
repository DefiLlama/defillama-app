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

	return (
		<button
			onClick={handleClick}
			className={`rounded-md py-2 px-3 md:text-xs bg-[var(--btn-bg)] hover:bg-[var(--btn-hover-bg)] focus-visible:bg-[var(--btn-hover-bg)] ${
				nestedMenu ? 'text-left' : ''
			}`}
		>
			Reset all filters
		</button>
	)
}
