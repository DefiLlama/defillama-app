import * as Ariakit from '@ariakit/react'
import { useRouter } from 'next/router'
import { FilterBetweenRange } from '~/components/Filters/FilterBetweenRange'
import type { FormSubmitEvent } from '~/types/forms'
import { pushShallowQuery, readSingleQueryValue } from '~/utils/routerQuery'

type QueryUpdates = Record<string, string | string[] | undefined>

export function AvailableRange({
	variant = 'primary',
	nestedMenu,
	placement,
	pushQueryUpdates
}: {
	variant?: 'primary' | 'secondary'
	nestedMenu?: boolean
	placement?: Ariakit.PopoverStoreProps['placement']
	pushQueryUpdates?: (updates: QueryUpdates) => void
}) {
	const router = useRouter()

	const updateQuery = (updates: QueryUpdates) => {
		if (pushQueryUpdates) {
			pushQueryUpdates(updates)
			return
		}
		void pushShallowQuery(router, updates)
	}

	const handleSubmit = (e: FormSubmitEvent) => {
		e.preventDefault()
		const form = e.currentTarget
		const minAvailable = form.min?.value
		const maxAvailable = form.max?.value

		updateQuery({
			minAvailable: minAvailable || undefined,
			maxAvailable: maxAvailable || undefined
		})
	}

	const minAvailable = readSingleQueryValue(router.query.minAvailable)
	const maxAvailable = readSingleQueryValue(router.query.maxAvailable)

	const handleClear = () => {
		updateQuery({ minAvailable: undefined, maxAvailable: undefined })
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
