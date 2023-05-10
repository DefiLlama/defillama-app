import { FormEventHandler } from 'react'
import { MenuButtonArrow } from 'ariakit'
import { ApplyFilters } from '~/components'
import Popover from '~/components/Popover'
import { PopoverContent, PopoverForm } from './Base'

interface IFilterByValue {
	header: string
	variant?: 'primary' | 'secondary'
	onSubmit: FormEventHandler<HTMLFormElement>
}

export function FilterByValue({ header, onSubmit, variant = 'primary' }: IFilterByValue) {
	return (
		<Popover
			trigger={
				<>
					<span>{header}</span>
					<MenuButtonArrow />
				</>
			}
			content={
				<PopoverContent>
					<PopoverForm onSubmit={onSubmit}>
						<label>
							<input type="number" name="max" />
						</label>
						<ApplyFilters>Apply Filter</ApplyFilters>
					</PopoverForm>
				</PopoverContent>
			}
		/>
	)
}
