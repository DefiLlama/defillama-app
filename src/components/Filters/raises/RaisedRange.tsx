import { useRouter } from 'next/router'
import { FilterBetweenRange } from '~/components/Filters/FilterBetweenRange'
import * as Ariakit from '@ariakit/react'

export function RaisedRange({
	variant = 'primary',
	nestedMenu,
	placement
}: {
	variant?: 'primary' | 'secondary'
	nestedMenu?: boolean
	placement?: Ariakit.PopoverStoreProps['placement']
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

	const handleClear = () => {
		const { minRaised, maxRaised, ...restQuery } = router.query

		router.push(
			{
				pathname: router.pathname,
				query: restQuery
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
			trigger={
				<>
					{min || max ? (
						<>
							<span>Amount Raised: </span>
							<span className="text-(--link)">{`${min || 'min'} - ${max || 'max'}`}</span>
						</>
					) : (
						<span>Amount Raised</span>
					)}
				</>
			}
			onSubmit={handleSubmit}
			onClear={handleClear}
			variant={variant}
			nestedMenu={nestedMenu}
			min={min}
			max={max}
			placement={placement}
		/>
	)
}
