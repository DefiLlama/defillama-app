import { useRouter } from 'next/router'
import { FilterBetweenRange } from '../shared'

export function APYRange() {
	const router = useRouter()

	const handleSubmit = (e) => {
		e.preventDefault()
		const form = e.target
		const minApy = form.minApy?.value
		const maxApy = form.maxApy?.value

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
	return <FilterBetweenRange header="Filter by APY" onSubmit={handleSubmit} />
}
