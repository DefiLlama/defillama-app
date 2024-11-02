import { useRouter } from 'next/router'
import { FilterBetweenRange } from '../common'

interface IAPYRange {
	variant?: 'primary' | 'secondary'
	subMenu?: boolean
}

export function APYRange({ variant = 'primary', subMenu }: IAPYRange) {
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
			header={
				variant === 'secondary' ? (
					<>
						{min || max ? (
							<>
								<span>APY: </span>
								<span className="text-[var(--link)]">{`${min || 'min'} - ${max || 'max'}`}</span>
							</>
						) : (
							'APY'
						)}
					</>
				) : (
					'Filter by APY'
				)
			}
			onSubmit={handleSubmit}
			variant={variant}
			subMenu={subMenu}
		/>
	)
}
