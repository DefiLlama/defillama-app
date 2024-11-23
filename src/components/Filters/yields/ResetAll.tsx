import { useRouter } from 'next/router'
import { MenuItem } from '~/components/SlidingMenu'

export function ResetAllYieldFilters({
	pathname,
	subMenu,
	resetContext
}: {
	pathname: string
	subMenu?: boolean
	resetContext?: () => void
}) {
	const router = useRouter()

	const handleClick = () => {
		router.push(pathname, undefined, { shallow: true })
		resetContext?.()
	}

	if (subMenu) {
		return <MenuItem label="Reset all filters" onClick={handleClick} />
	}

	return (
		<button
			onClick={handleClick}
			className="rounded-md py-2 px-3 md:text-xs bg-[var(--btn-bg)] hover:bg-[var(--btn-hover-bg)] focus-visible:bg-[var(--btn-hover-bg)]"
		>
			Reset all filters
		</button>
	)
}
