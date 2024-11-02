import { useRouter } from 'next/router'
import { FilterBetweenRange } from '~/components/Filters/common/FilterBetweenRange'

export function RaisedRange({
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
		const minRaised = form.min?.value
		const maxRaised = form.max?.value

		router.push(
			{
				pathname: router.pathname,
				query: {
					...router.query,
					minRaised,
					maxRaised
				}
			},
			undefined,
			{
				shallow: true
			}
		)
	}

	const { minRaised, maxRaised } = router.query
	const min = typeof minRaised === 'string' && minRaised !== '' ? Number(minRaised).toLocaleString() : null
	const max = typeof maxRaised === 'string' && maxRaised !== '' ? Number(maxRaised).toLocaleString() : null

	return (
		<FilterBetweenRange
			name="Amount Raised"
			header={
				<>
					{min || max ? (
						<>
							<span>Amount Raised: </span>
							<span className="text-[var(--link)]">{`${min || 'min'} - ${max || 'max'}`}</span>
						</>
					) : (
						<span>Amount Raised</span>
					)}
				</>
			}
			onSubmit={handleSubmit}
			variant={variant}
			subMenu={subMenu}
		/>
	)
}
