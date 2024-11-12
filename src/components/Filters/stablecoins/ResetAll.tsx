import { useRouter } from 'next/router'
import { useStablecoinsManager, STABLECOINS_SETTINGS } from '~/contexts/LocalStorage'

export function ResetAllStablecoinFilters({ pathname, subMenu }: { pathname: string; subMenu: boolean }) {
	const router = useRouter()
	const [state, updater] = useStablecoinsManager()

	return (
		<button
			onClick={() => {
				Object.values(STABLECOINS_SETTINGS)
					.filter((setting) => !state[setting])
					.map((setting) => updater(setting)())
				router.push(pathname, undefined, { shallow: true })
			}}
			className="rounded-md py-2 px-3 text-sm sm:text-xs bg-[var(--btn-bg)] hover:bg-[var(--btn-hover-bg)] focus-visible:bg-[var(--btn-hover-bg)] max-sm:text-left"
		>
			Reset all filters
		</button>
	)
}
