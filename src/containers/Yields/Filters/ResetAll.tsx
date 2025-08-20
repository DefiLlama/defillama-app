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
			className={`rounded-md bg-(--btn-bg) px-3 py-2 hover:bg-(--btn-hover-bg) focus-visible:bg-(--btn-hover-bg) md:text-xs ${
				nestedMenu ? 'text-left' : ''
			}`}
		>
			Reset all filters
		</button>
	)
}
