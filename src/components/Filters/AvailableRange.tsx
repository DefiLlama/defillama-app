import { useRouter } from 'next/router'
import { FilterBetweenRange } from '~/components/Filters/FilterBetweenRange'

export function AvailableRange({
	variant = 'primary',
	nestedMenu
}: {
	variant?: 'primary' | 'secondary'
	nestedMenu?: boolean
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
			trigger={
				variant === 'secondary' ? (
					<>
						{min || max ? (
							<>
								<span>Available: </span>
								<span className="text-(--link)">{`${min || 'min'} - ${max || 'max'}`}</span>
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
			nestedMenu={nestedMenu}
			min={min}
			max={max}
			variant="secondary"
		/>
	)
}
