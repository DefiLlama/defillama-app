import { FormEventHandler, ReactNode } from 'react'
import styled from 'styled-components'
import { MenuButtonArrow } from 'ariakit'
import { ApplyFilters } from '~/components'
import Popover from '~/components/Popover'
import { SlidingMenu } from '~/components/SlidingMenu'

interface IFilterBetweenRange {
	name: string
	header: ReactNode
	variant?: 'primary' | 'secondary'
	onSubmit: FormEventHandler<HTMLFormElement>
	subMenu?: boolean
}

export function FilterBetweenRange({ name, header, onSubmit, variant = 'primary', subMenu }: IFilterBetweenRange) {
	if (subMenu) {
		return (
			<SlidingMenu label={name}>
				<Form onSubmit={onSubmit} data-variant={variant}>
					<label>
						<span>Min</span>
						<input type="number" name="min" />
					</label>
					<label>
						<span>Max</span>
						<input type="number" name="max" />
					</label>
					<ApplyFilters>Apply Filter</ApplyFilters>
				</Form>
			</SlidingMenu>
		)
	}

	return (
		<Popover
			trigger={
				<>
					{variant === 'secondary' ? <>{header}</> : <span>{header}</span>}
					<MenuButtonArrow />
				</>
			}
			content={
				<Content>
					<Form onSubmit={onSubmit}>
						<label>
							<span>Min</span>
							<input type="number" name="min" />
						</label>
						<label>
							<span>Max</span>
							<input type="number" name="max" />
						</label>
						<ApplyFilters>Apply Filter</ApplyFilters>
					</Form>
				</Content>
			}
			variant={variant}
		/>
	)
}

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

	&[data-variant='secondary'] {
		padding: 12px;
	}

	@media screen and (min-width: 640px) {
		label {
			margin: 12px 12px 0;
		}

		&[data-variant='secondary'] {
			padding: 0;
		}
	}
`

const Content = styled.div`
	width: 240px;
	margin: 0 auto;
`
