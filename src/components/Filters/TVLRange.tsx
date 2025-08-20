import { useRouter } from 'next/router'
import * as Ariakit from '@ariakit/react'
import { FilterBetweenRange } from '~/components/Filters/FilterBetweenRange'

export function TVLRange({
	variant = 'primary',
	nestedMenu,
	triggerClassName,
	placement
}: {
	variant?: 'primary' | 'secondary' | 'third'
	nestedMenu?: boolean
	triggerClassName?: string
	placement?: Ariakit.PopoverStoreProps['placement']
}) {
	const router = useRouter()

	const handleSubmit = (e) => {
		e.preventDefault()
		const form = e.target
		const minTvl = form.min?.value
		const maxTvl = form.max?.value

		router.push(
			{
				pathname: router.pathname,
				query: {
					...router.query,
					minTvl,
					maxTvl
				}
			},
			undefined,
			{
				shallow: true
			}
		)
	}

	const handleClear = () => {
		const { minTvl, maxTvl, ...restQuery } = router.query

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

	const { minTvl, maxTvl } = router.query
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
