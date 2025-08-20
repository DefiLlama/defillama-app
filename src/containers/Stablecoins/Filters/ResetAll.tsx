import { useRouter } from 'next/router'
import { useManageAppSettings, STABLECOINS_SETTINGS } from '~/contexts/LocalStorage'

export function ResetAllStablecoinFilters({ pathname }: { pathname: string; nestedMenu: boolean }) {
	const router = useRouter()
	const [state, updater] = useManageAppSettings()

	return (
		<button
			onClick={() => {
				updater(Object.fromEntries(Object.values(STABLECOINS_SETTINGS).map((s) => [s, false])))
				router.push(pathname, undefined, { shallow: true })
			}}
			className="relative flex cursor-pointer flex-nowrap items-center justify-between gap-2 rounded-md border border-(--form-control-border) px-2 py-[6px] text-xs font-medium text-(--text-form) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg)"
		>
			Reset all filters
		</button>
	)
}
