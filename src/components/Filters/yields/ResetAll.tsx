import { useRouter } from 'next/router'

export function ResetAllYieldFilters({
	pathname,
	variant = 'primary'
}: {
	pathname: string
	variant?: 'primary' | 'secondary'
}) {
	const router = useRouter()

	return (
		<button
			onClick={() => {
				router.push(pathname, undefined, { shallow: true })
			}}
			style={{ textDecoration: 'underline' }}
		>
			Reset all filters
		</button>
	)
}
