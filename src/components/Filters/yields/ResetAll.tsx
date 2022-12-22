import { useRouter } from 'next/router'
import { MenuItem } from '~/components/SlidingMenu'
import { ResetAllButton } from '../v2Base'

export function ResetAllYieldFilters({
	pathname,
	variant = 'primary',
	subMenu,
	resetContext
}: {
	pathname: string
	variant?: 'primary' | 'secondary'
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
		<ResetAllButton onClick={handleClick} data-variant={variant}>
			Reset all filters
		</ResetAllButton>
	)
}
