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
			style={{ textDecoration: 'underline' }}
		>
			Reset all filters
		</button>
	)
}
