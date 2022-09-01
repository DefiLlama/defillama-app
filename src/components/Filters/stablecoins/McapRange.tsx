import { useRouter } from 'next/router'
import { FilterBetweenRange } from '../shared'

export function McapRange() {
	const router = useRouter()

	const handleSubmit = (e) => {
		e.preventDefault()
		const form = e.target
		const minMcap = form.minMcap?.value
		const maxMcap = form.maxMcap?.value

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
	return <FilterBetweenRange header="Filter by Mcap" onSubmit={handleSubmit} minName={'minMcap'} maxName={'maxMcap'}/>
}
