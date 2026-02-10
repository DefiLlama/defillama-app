import * as Ariakit from '@ariakit/react'
import { useRouter } from 'next/router'
import { FilterBetweenRange } from '~/components/Filters/FilterBetweenRange'
import { pushShallowQuery, readSingleQueryValue } from '~/utils/routerQuery'

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

		pushShallowQuery(router, {
			minAvailable: minAvailable || undefined,
			maxAvailable: maxAvailable || undefined
		})
	}

	const minAvailable = readSingleQueryValue(router.query.minAvailable)
	const maxAvailable = readSingleQueryValue(router.query.maxAvailable)

	const handleClear = () => {
		pushShallowQuery(router, { minAvailable: undefined, maxAvailable: undefined })
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
