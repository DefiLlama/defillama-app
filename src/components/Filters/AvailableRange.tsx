import * as Ariakit from '@ariakit/react'
import Router, { useRouter } from 'next/router'
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

		const params = new URLSearchParams(window.location.search)
		if (minAvailable) params.set('minAvailable', minAvailable)
		else params.delete('minAvailable')
		if (maxAvailable) params.set('maxAvailable', maxAvailable)
		else params.delete('maxAvailable')
		Router.push(`${window.location.pathname}?${params.toString()}`, undefined, { shallow: true })
	}

	const { minAvailable, maxAvailable } = router.query

	const handleClear = () => {
		const params = new URLSearchParams(window.location.search)
		params.delete('minAvailable')
		params.delete('maxAvailable')
		const queryString = params.toString()
		const newUrl = queryString ? `${window.location.pathname}?${queryString}` : window.location.pathname
		Router.push(newUrl, undefined, { shallow: true })
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
							'Filter by min/max Available'
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
