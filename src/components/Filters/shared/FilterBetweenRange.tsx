import { FormEventHandler } from 'react'
import styled from 'styled-components'
import { MenuButtonArrow } from 'ariakit'
import { ApplyFilters } from '~/components'
import Popover from '~/components/Popover'

interface IFilterBetweenRange {
	header: string
	onSubmit: FormEventHandler<HTMLFormElement>
}

export function FilterBetweenRange({ header, onSubmit }: IFilterBetweenRange) {
	return (
		<Wrapper
			trigger={
				<>
					<span>{header}</span>
					<MenuButtonArrow />
				</>
			}
			content={
				<Content>
					<Form onSubmit={onSubmit}>
						<label>
							<span>Min</span>
							<input type="number" name="minTvl" />
						</label>
						<label>
							<span>Max</span>
							<input type="number" name="maxTvl" />
						</label>
						<ApplyFilters>Apply Filter</ApplyFilters>
					</Form>
				</Content>
			}
		/>
	)
}

const Wrapper = styled(Popover)`
	padding: 0;
`

export const Form = styled.form`
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

const Content = styled.div`
	width: 240px;
	margin: 0 auto;
`
