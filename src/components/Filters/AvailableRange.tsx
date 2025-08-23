import { useRouter } from 'next/router'
import * as Ariakit from '@ariakit/react'
import { FilterBetweenRange } from '~/components/Filters/FilterBetweenRange'

export function AvailableRange({
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

	const { minAvailable, maxAvailable, ...restQuery } = router.query

	const handleClear = () => {
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

	const min = typeof minAvailable === 'string' && minAvailable !== '' ? Number(minAvailable) : null
	const max = typeof maxAvailable === 'string' && maxAvailable !== '' ? Number(maxAvailable) : null

	return (
		<FilterBetweenRange
			name="Available"
			trigger={
				variant === 'secondary' ? (
					<>
						{min || max ? (
							<>
								<span>Available: </span>
								<span className="text-(--link)">{`${min?.toLocaleString() ?? 'min'} - ${
									max?.toLocaleString() ?? 'max'
								}`}</span>
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
			onClear={handleClear}
			nestedMenu={nestedMenu}
			min={min}
			max={max}
			variant="secondary"
			placement={placement}
		/>
	)
}
