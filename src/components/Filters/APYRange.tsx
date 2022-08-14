import { MenuButtonArrow } from 'ariakit'
import { useRouter } from 'next/router'
import styled from 'styled-components'
import { ApplyFilters } from '~/components'
import Popover from '~/components/Popover'
import { TvlFilterForm } from './TVLRange'

const Wrapper = styled(Popover)`
	padding: 0;
`

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
	return (
		<Wrapper
			trigger={
				<>
					<span>Filter by APY</span>
					<MenuButtonArrow />
				</>
			}
			content={
				<section style={{ width: '240px', margin: '0 auto' }}>
					<TvlFilterForm onSubmit={handleSubmit}>
						<label>
							<span>Min</span>
							<input type="number" name="minApy" />
						</label>
						<label>
							<span>Max</span>
							<input type="number" name="maxApy" />
						</label>
						<ApplyFilters>Apply Filter</ApplyFilters>
					</TvlFilterForm>
				</section>
			}
		/>
	)
}
