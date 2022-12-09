import { useRouter } from 'next/router'
import { FilterBetweenRange } from '../shared'

export function AvailableRange() {
	const router = useRouter()

	const handleSubmit = (e) => {
		e.preventDefault()
		const form = e.target
		const minAvailable = form.min?.value
		const maxAvailable = form.max?.value

		router.push(
			{
				pathname: router.pathname,
				query: {
					...router.query,
					minAvailable,
					maxAvailable
				}
			},
			undefined,
			{
				shallow: true
			}
		)
	}
	return <FilterBetweenRange name="Available" header="Filter by min/max Available" onSubmit={handleSubmit} />
}
