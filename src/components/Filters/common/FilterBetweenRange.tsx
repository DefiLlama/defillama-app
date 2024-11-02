import { FormEventHandler, ReactNode } from 'react'
import { MenuButtonArrow } from 'ariakit/menu'
import { ApplyFilters } from '~/components'
import { Popover } from '~/components/Popover'
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
				<form onSubmit={onSubmit} className="flex flex-col gap-2">
					<label className="flex flex-col gap-1 m-3 mb-0">
						<span>Min</span>
						<input
							type="number"
							name="min"
							className="p-2 rounded-md bg-white dark:bg-black text-black dark:text-white disabled:opacity-50"
						/>
					</label>
					<label className="flex flex-col gap-1 m-3 mb-0">
						<span>Max</span>
						<input
							type="number"
							name="max"
							className="p-2 rounded-md bg-white dark:bg-black text-black dark:text-white disabled:opacity-50"
						/>
					</label>
					<ApplyFilters>Apply Filter</ApplyFilters>
				</form>
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
				<div className="w-[240px] mx-auto">
					<form onSubmit={onSubmit} className="flex flex-col gap-2">
						<label className="flex flex-col gap-1 m-3 mb-0">
							<span>Min</span>
							<input
								type="number"
								name="min"
								className="p-2 rounded-md bg-white dark:bg-black text-black dark:text-white disabled:opacity-50"
							/>
						</label>
						<label className="flex flex-col gap-1 m-3 mb-0">
							<span>Max</span>
							<input
								type="number"
								name="max"
								className="p-2 rounded-md bg-white dark:bg-black text-black dark:text-white disabled:opacity-50"
							/>
						</label>
						<ApplyFilters>Apply Filter</ApplyFilters>
					</form>
				</div>
			}
			variant={variant}
		/>
	)
}
