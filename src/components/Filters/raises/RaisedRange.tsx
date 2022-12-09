import { useRouter } from 'next/router'
import { FilterBetweenRange } from '../shared'

export function RaisedRange() {
	const router = useRouter()

	const handleSubmit = (e) => {
		e.preventDefault()
		const form = e.target
		const minRaised = form.min?.value
		const maxRaised = form.max?.value

		router.push(
			{
				pathname: router.pathname,
				query: {
					...router.query,
					minRaised,
					maxRaised
				}
			},
			undefined,
			{
				shallow: true
			}
		)
	}
	return <FilterBetweenRange name="Amount Raised" header="Filter by Amount Raised" onSubmit={handleSubmit} />
}
