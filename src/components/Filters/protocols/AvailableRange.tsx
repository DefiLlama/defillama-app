import { useRouter } from 'next/router'
import { FilterBetweenRange } from '../common'

export function AvailableRange({
	variant = 'primary',
	subMenu
}: {
	variant?: 'primary' | 'secondary'
	subMenu?: boolean
}) {
	const router = useRouter()

	const handleSubmit = (e) => {
		e.preventDefault()
		const form = e.target
		const minAvailable = form.min?.value
		const maxAvailable = form.max?.value

		router.push(
			{
				pathname: router.pathname,
				query: {
					...router.query,
					minAvailable,
					maxAvailable
				}
			},
			undefined,
			{
				shallow: true
			}
		)
	}

	const { minAvailable, maxAvailable } = router.query
	const min = typeof minAvailable === 'string' && minAvailable !== '' ? Number(minAvailable).toLocaleString() : null
	const max = typeof maxAvailable === 'string' && maxAvailable !== '' ? Number(maxAvailable).toLocaleString() : null

	return (
		<FilterBetweenRange
			name="Available"
			header={
				variant === 'secondary' ? (
					<>
						{min || max ? (
							<>
								<span>Available: </span>
								<span className="text-[var(--link)]">{`${min || 'min'} - ${max || 'max'}`}</span>
							</>
						) : (
							'Available'
						)}
					</>
				) : (
					'Filter by min/max Available'
				)
			}
			onSubmit={handleSubmit}
			variant={variant}
			subMenu={subMenu}
		/>
	)
}
