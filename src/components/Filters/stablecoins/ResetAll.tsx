import { useRouter } from 'next/router'
import { useStablecoinsManager, STABLECOINS_SETTINGS } from '~/contexts/LocalStorage'

export function ResetAllStablecoinFilters({ pathname }: { pathname: string }) {
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
			className="bg-[var(--btn2-bg)]  hover:bg-[var(--btn2-hover-bg)] focus-visible:bg-[var(--btn2-hover-bg)] flex items-center justify-between gap-2 py-2 px-3 rounded-lg cursor-pointer text-[var(--text1)] flex-nowrap relative"
		>
			Reset all filters
		</button>
	)
}
