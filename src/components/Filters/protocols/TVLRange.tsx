import { useRouter } from 'next/router'
import { FilterBetweenRange } from '../shared'

export function TVLRange() {
	const router = useRouter()

	const handleSubmit = (e) => {
		e.preventDefault()
		const form = e.target
		const minTvl = form.minTvl?.value
		const maxTvl = form.maxTvl?.value

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
	return <FilterBetweenRange header="Filter by TVL" onSubmit={handleSubmit} />
}
