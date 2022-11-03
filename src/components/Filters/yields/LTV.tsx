import { useRouter } from 'next/router'
import { FilterByValue } from '../shared'

export function LTV({ header }) {
	const router = useRouter()

	const handleSubmit = (e) => {
		e.preventDefault()
		const form = e.target
		const customLTV = form.max?.value

		router.push(
			{
				pathname: router.pathname,
				query: {
					...router.query,
					customLTV
				}
			},
			undefined,
			{
				shallow: true
			}
		)
	}
	return <FilterByValue header={header} onSubmit={handleSubmit} />
}
