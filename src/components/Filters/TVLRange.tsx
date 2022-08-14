import { MenuButtonArrow } from 'ariakit'
import { useRouter } from 'next/router'
import styled from 'styled-components'
import { ApplyFilters } from '~/components'
import Popover from '~/components/Popover'

const Wrapper = styled(Popover)`
	padding: 0;
`

export const TvlFilterForm = styled.form`
	display: flex;
	flex-direction: column;
	gap: 8px;

	label {
		display: flex;
		flex-direction: column;
		gap: 4px;
		font: inherit;
		margin: 12px 0 0;
	}

	input {
		padding: 8px;
		border-radius: 4px;
		border: ${({ theme }) => '1px solid ' + theme.text4};
		background: ${({ theme }) => (theme.mode === 'dark' ? '#000' : '#fff')};
		color: ${({ theme }) => theme.text1};
		font: inherit;
	}

	@media (min-width: 640px) {
		label {
			margin: 12px 12px 0;
		}
	}
`

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
	return (
		<Wrapper
			trigger={
				<>
					<span>Filter by TVL</span>
					<MenuButtonArrow />
				</>
			}
			content={
				<section style={{ width: '240px', margin: '0 auto' }}>
					<TvlFilterForm onSubmit={handleSubmit}>
						<label>
							<span>Min</span>
							<input type="number" name="minTvl" />
						</label>
						<label>
							<span>Max</span>
							<input type="number" name="maxTvl" />
						</label>
						<ApplyFilters>Apply Filter</ApplyFilters>
					</TvlFilterForm>
				</section>
			}
		/>
	)
}
