import { useRouter } from 'next/router'
import { STABLECOINS_SETTINGS, useManageAppSettings } from '~/contexts/LocalStorage'

export function ResetAllStablecoinFilters({ pathname }: { pathname: string; nestedMenu: boolean }) {
	const router = useRouter()
	const [state, updater] = useManageAppSettings()

	// Check if any filters are active (query params or settings)
	const hasActiveQueryFilters = Object.keys(router.query).length > 0
	const hasActiveSettings = Object.values(STABLECOINS_SETTINGS).some((setting) => state[setting] === true)
	const hasActiveFilters = hasActiveQueryFilters || hasActiveSettings

	return (
		<button
			onClick={() => {
				updater(Object.fromEntries(Object.values(STABLECOINS_SETTINGS).map((s) => [s, false])))
				router.push(pathname, undefined, { shallow: true })
			}}
			disabled={!hasActiveFilters}
			className="relative flex cursor-pointer flex-nowrap items-center justify-between gap-2 rounded-md border border-(--form-control-border) px-2 py-1.5 text-xs font-medium text-(--text-form) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) disabled:cursor-not-allowed disabled:opacity-40"
		>
			Reset all filters
		</button>
	)
}
