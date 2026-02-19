import * as Ariakit from '@ariakit/react'
import { useRouter } from 'next/router'
import { FilterBetweenRange } from '~/components/Filters/FilterBetweenRange'
import type { FormSubmitEvent } from '~/types/forms'
import { pushShallowQuery, readSingleQueryValue } from '~/utils/routerQuery'

export function TVLRange({
	variant = 'primary',
	nestedMenu,
	triggerClassName,
	placement,
	onValueChange
}: {
	variant?: 'primary' | 'secondary'
	nestedMenu?: boolean
	triggerClassName?: string
	placement?: Ariakit.PopoverStoreProps['placement']
	onValueChange?: (min: number | null, max: number | null) => void
}) {
	const router = useRouter()

	const handleSubmit = (e: FormSubmitEvent) => {
		e.preventDefault()
		const form = e.currentTarget
		const minTvl = form.min?.value
		const maxTvl = form.max?.value

		onValueChange?.(minTvl ? Number(minTvl) : null, maxTvl ? Number(maxTvl) : null)

		pushShallowQuery(router, {
			minTvl: minTvl || undefined,
			maxTvl: maxTvl || undefined
		})
	}

	const minTvl = readSingleQueryValue(router.query.minTvl)
	const maxTvl = readSingleQueryValue(router.query.maxTvl)

	const handleClear = () => {
		onValueChange?.(null, null)
		pushShallowQuery(router, { minTvl: undefined, maxTvl: undefined })
	}

	const min = typeof minTvl === 'string' && minTvl !== '' ? Number(minTvl) : null
	const max = typeof maxTvl === 'string' && maxTvl !== '' ? Number(maxTvl) : null

	return (
		<FilterBetweenRange
			name="TVL Range"
			trigger={
				variant === 'secondary' ? (
					<>
						{min || max ? (
							<>
								<span>TVL: </span>
								<span className="text-(--link)">{`${min?.toLocaleString() ?? 'min'} - ${
									max?.toLocaleString() ?? 'max'
								}`}</span>
							</>
						) : (
							<span>TVL Range</span>
						)}
					</>
				) : (
					'TVL Range'
				)
			}
			onSubmit={handleSubmit}
			onClear={handleClear}
			variant={variant}
			nestedMenu={nestedMenu}
			min={min}
			max={max}
			triggerClassName={triggerClassName}
			placement={placement}
		/>
	)
}
