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
		<button onClick={handleClick} className="rounded-md py-2 px-3 text-xs bg-[#eaeaea] dark:bg-[#22242a]">
			Reset all filters
		</button>
	)
}
