import { useRouter } from 'next/router'
import { FilterByValue } from '../shared'

export function LTV() {
	const router = useRouter()

	const handleSubmit = (e) => {
		e.preventDefault()
		const form = e.target
		const maxLTV = form.max?.value

		router.push(
			{
				pathname: router.pathname,
				query: {
					...router.query,
					maxLTV
				}
			},
			undefined,
			{
				shallow: true
			}
		)
	}
	return <FilterByValue header="Custom LTV" onSubmit={handleSubmit} />
}
