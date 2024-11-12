import { useRouter } from 'next/router'
import { FilterBetweenRange } from '~/components/Filters/common/FilterBetweenRange'

export function McapRange({ subMenu }: { subMenu?: boolean }) {
	const router = useRouter()

	const handleSubmit = (e) => {
		e.preventDefault()
		const form = e.target
		const minMcap = form.min?.value
		const maxMcap = form.max?.value

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

	const { minMcap, maxMcap } = router.query
	const min = typeof minMcap === 'string' && minMcap !== '' ? Number(minMcap).toLocaleString() : null
	const max = typeof maxMcap === 'string' && maxMcap !== '' ? Number(maxMcap).toLocaleString() : null

	return (
		<FilterBetweenRange
			name="Mcap"
			header={
				<>
					{min || max ? (
						<>
							<span>Mcap: </span>
							<span className="text-[var(--link)]">{`${min || 'min'} - ${max || 'max'}`}</span>
						</>
					) : (
						'Mcap'
					)}
				</>
			}
			onSubmit={handleSubmit}
			variant={'secondary'}
			subMenu={subMenu}
		/>
	)
}
