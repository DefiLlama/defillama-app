import { FormEventHandler, ReactNode } from 'react'
import { MenuButtonArrow } from 'ariakit/menu'
import { ApplyFilters } from '~/components'
import Popover from '~/components/Popover'
import { SlidingMenu } from '~/components/SlidingMenu'
import { PopoverForm, PopoverContent } from './Base'

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
				<PopoverForm onSubmit={onSubmit} data-variant={variant}>
					<label>
						<span>Min</span>
						<input type="number" name="min" />
					</label>
					<label>
						<span>Max</span>
						<input type="number" name="max" />
					</label>
					<ApplyFilters>Apply Filter</ApplyFilters>
				</PopoverForm>
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
				<PopoverContent>
					<PopoverForm onSubmit={onSubmit}>
						<label>
							<span>Min</span>
							<input type="number" name="min" />
						</label>
						<label>
							<span>Max</span>
							<input type="number" name="max" />
						</label>
						<ApplyFilters>Apply Filter</ApplyFilters>
					</PopoverForm>
				</PopoverContent>
			}
			variant={variant}
		/>
	)
}
