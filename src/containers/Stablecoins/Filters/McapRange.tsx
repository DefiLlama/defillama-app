import { useRouter } from 'next/router'
import * as Ariakit from '@ariakit/react'
import { FilterBetweenRange } from '~/components/Filters/FilterBetweenRange'

export function McapRange({
	nestedMenu,
	placement
}: {
	nestedMenu?: boolean
	placement?: Ariakit.PopoverStoreProps['placement']
}) {
	const router = useRouter()

	const handleSubmit = (e) => {
		e.preventDefault()
		const form = e.target
		const minMcap = form.min?.value
		const maxMcap = form.max?.value

		router.push(
			{
				pathname: router.pathname,
				query: {
					...router.query,
					minMcap,
					maxMcap
				}
			},
			undefined,
			{
				shallow: true
			}
		)
	}

	const handleClear = () => {
		const { minMcap, maxMcap, ...restQuery } = router.query

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

	const { minMcap, maxMcap } = router.query
	const min = typeof minMcap === 'string' && minMcap !== '' ? Number(minMcap) : null
	const max = typeof maxMcap === 'string' && maxMcap !== '' ? Number(maxMcap) : null

	return (
		<FilterBetweenRange
			name="Mcap"
			trigger={
				<>
					{min || max ? (
						<>
							<span>Mcap: </span>
							<span className="text-(--link)">{`${min?.toLocaleString() ?? 'min'} - ${
								max?.toLocaleString() ?? 'max'
							}`}</span>
						</>
					) : (
						'Mcap'
					)}
				</>
			}
			onSubmit={handleSubmit}
			onClear={handleClear}
			nestedMenu={nestedMenu}
			min={min}
			max={max}
			placement={placement}
		/>
	)
}
