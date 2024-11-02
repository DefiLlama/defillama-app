import { useRouter } from 'next/router'
import { FilterBetweenRange } from '~/components/Filters/common/FilterBetweenRange'

export function TVLRange({ variant = 'primary', subMenu }: { variant?: 'primary' | 'secondary'; subMenu?: boolean }) {
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

	const { minTvl, maxTvl } = router.query
	const min = typeof minTvl === 'string' && minTvl !== '' ? Number(minTvl).toLocaleString() : null
	const max = typeof maxTvl === 'string' && maxTvl !== '' ? Number(maxTvl).toLocaleString() : null

	return (
		<FilterBetweenRange
			name="TVL Range"
			header={
				variant === 'secondary' ? (
					<>
						{min || max ? (
							<>
								<span>TVL: </span>
								<span className="text-[var(--link)]">{`${min || 'min'} - ${max || 'max'}`}</span>
							</>
						) : (
							<span>TVL</span>
						)}
					</>
				) : (
					'TVL Range'
				)
			}
			onSubmit={handleSubmit}
			variant={variant}
			subMenu={subMenu}
		/>
	)
}
