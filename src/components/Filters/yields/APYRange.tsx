import { useRouter } from 'next/router'
import { FilterBetweenRange } from '~/components/Filters/FilterBetweenRange'

interface IAPYRange {
	nestedMenu?: boolean
}

export function APYRange({ nestedMenu }: IAPYRange) {
	const router = useRouter()

	const handleSubmit = (e) => {
		e.preventDefault()
		const form = e.target
		const minApy = form.min?.value
		const maxApy = form.max?.value

		router.push(
			{
				pathname: router.pathname,
				query: {
					...router.query,
					minApy,
					maxApy
				}
			},
			undefined,
			{
				shallow: true
			}
		)
	}

	const { minApy, maxApy } = router.query
	const min = typeof minApy === 'string' && minApy !== '' ? Number(minApy).toLocaleString() : null
	const max = typeof maxApy === 'string' && maxApy !== '' ? Number(maxApy).toLocaleString() : null

	return (
		<FilterBetweenRange
			name="APY Range"
			trigger={
				<>
					{min || max ? (
						<>
							<span>APY: </span>
							<span className="text-[var(--link)]">{`${min || 'min'} - ${max || 'max'}`}</span>
						</>
					) : (
						<span>APY</span>
					)}
				</>
			}
			variant="secondary"
			onSubmit={handleSubmit}
			nestedMenu={nestedMenu}
			min={min}
			max={max}
		/>
	)
}
