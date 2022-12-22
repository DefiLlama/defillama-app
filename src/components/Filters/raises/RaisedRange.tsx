import { useRouter } from 'next/router'
import { FilterBetweenRange, SecondaryLabel } from '../common'

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

	const label =
		min || max ? (
			<>
				<span>Amount Raised: </span>
				<span data-selecteditems>{`${min || 'min'} - ${max || 'max'}`}</span>
			</>
		) : (
			'Amount Raised'
		)

	const Header = () => {
		return <SecondaryLabel>{label}</SecondaryLabel>
	}

	return (
		<FilterBetweenRange
			name="Amount Raised"
			header={variant === 'secondary' ? <Header /> : 'Filter by Amount Raised'}
			onSubmit={handleSubmit}
			variant={variant}
			subMenu={subMenu}
		/>
	)
}
