import { useRouter } from 'next/router'
import { FilterBetweenRange, SecondaryLabel } from '../shared'

export function TVLRange({ variant = 'primary' }: { variant?: 'primary' | 'secondary' }) {
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

	const label =
		min || max ? (
			<>
				<span>Min/Max TVL: </span>
				<span data-selecteditems>{`${min || 'min'} - ${max || 'max'}`}</span>
			</>
		) : (
			'min/max TVL'
		)

	const Header = () => {
		return <SecondaryLabel>{label}</SecondaryLabel>
	}

	return (
		<FilterBetweenRange
			header={variant === 'secondary' ? <Header /> : 'Filter by min/max TVL'}
			onSubmit={handleSubmit}
			variant={variant}
		/>
	)
}
