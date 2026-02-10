import * as Ariakit from '@ariakit/react'
import { useRouter } from 'next/router'
import { FilterBetweenRange } from '~/components/Filters/FilterBetweenRange'

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

	const handleSubmit = (e) => {
		e.preventDefault()
		const form = e.target
		const minTvl = form.min?.value
		const maxTvl = form.max?.value

		onValueChange?.(minTvl ? Number(minTvl) : null, maxTvl ? Number(maxTvl) : null)

		const params = new URLSearchParams(window.location.search)
		if (minTvl) params.set('minTvl', minTvl)
		else params.delete('minTvl')
		if (maxTvl) params.set('maxTvl', maxTvl)
		else params.delete('maxTvl')
		const queryString = params.toString()
		const newUrl = queryString ? `${window.location.pathname}?${queryString}` : window.location.pathname
		router.push(newUrl, undefined, { shallow: true })
	}

	const { minTvl, maxTvl } = router.query

	const handleClear = () => {
		const params = new URLSearchParams(window.location.search)
		params.delete('minTvl')
		params.delete('maxTvl')
		const queryString = params.toString()
		const newUrl = queryString ? `${window.location.pathname}?${queryString}` : window.location.pathname
		router.push(newUrl, undefined, { shallow: true })
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
