import { useRouter } from 'next/router'
import { FilterBetweenRange, SecondaryLabel } from '../common'

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

	const label =
		min || max ? (
			<>
				<span>APY: </span>
				<span data-selecteditems>{`${min || 'min'} - ${max || 'max'}`}</span>
			</>
		) : (
			'APY'
		)

	const Header = () => {
		return <SecondaryLabel>{label}</SecondaryLabel>
	}

	return (
		<FilterBetweenRange
			name="APY Range"
			header={variant === 'secondary' ? <Header /> : 'Filter by APY'}
			onSubmit={handleSubmit}
			variant={variant}
			subMenu={subMenu}
		/>
	)
}
