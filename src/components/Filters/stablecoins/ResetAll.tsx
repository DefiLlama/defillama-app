import { useRouter } from 'next/router'
import { STABLECOINS_SETTINGS, useManageAppSettings } from '~/contexts/LocalStorage'

export function ResetAllStablecoinFilters({ pathname }: { pathname: string; nestedMenu: boolean }) {
	const router = useRouter()
	const [state, updater] = useManageAppSettings()

	return (
		<button
			onClick={() => {
				updater(Object.fromEntries(Object.values(STABLECOINS_SETTINGS).map((s) => [s, false])))
				router.push(pathname, undefined, { shallow: true })
			}}
			className="rounded-md py-2 px-3 text-sm sm:text-xs bg-(--btn-bg) hover:bg-(--btn-hover-bg) focus-visible:bg-(--btn-hover-bg) max-sm:text-left"
		>
			Reset all filters
		</button>
	)
}
