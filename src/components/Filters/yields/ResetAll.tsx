import { useRouter } from 'next/router'
import { useLocalStorageContext } from '~/contexts/LocalStorage'
import { options } from './Attributes'

export function ResetAllYieldFilters({ pathname }: { pathname: string }) {
	const router = useRouter()
	const [state, { updateKey }] = useLocalStorageContext()

	return (
		<button
			onClick={() => {
				options.forEach((option) => {
					const isEnabled = state[option.key]

					if (isEnabled) {
						updateKey(option.key, false)
					}
				})

				router.push(pathname, undefined, { shallow: true })
			}}
			style={{ textDecoration: 'underline' }}
		>
			Reset all filters
		</button>
	)
}
