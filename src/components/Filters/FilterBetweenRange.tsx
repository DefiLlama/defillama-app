import { FormEventHandler, ReactNode } from 'react'
import * as Ariakit from '@ariakit/react'
import { NestedMenu } from '~/components/NestedMenu'

interface IFilterBetweenRange {
	name: string
	trigger: ReactNode
	onSubmit: FormEventHandler<HTMLFormElement>
	nestedMenu?: boolean
	min: string | null
	max: string | null
	variant?: 'primary' | 'secondary' | 'third'
}

export function FilterBetweenRange({
	name,
	trigger,
	onSubmit,
	nestedMenu,
	min,
	max,
	variant = 'primary'
}: IFilterBetweenRange) {
	if (nestedMenu) {
		return (
			<NestedMenu label={name}>
				<form onSubmit={onSubmit} className="flex flex-col gap-2">
					<label className="flex flex-col gap-1 m-3 mb-0">
						<span>Min</span>
						<input
							type="number"
							name="min"
							className="p-2 rounded-md bg-white dark:bg-black text-black dark:text-white disabled:opacity-50 border border-black/10 dark:border-white/10"
							value={min || ''}
						/>
					</label>
					<label className="flex flex-col gap-1 m-3 mb-0">
						<span>Max</span>
						<input
							type="number"
							name="max"
							className="p-2 rounded-md bg-white dark:bg-black text-black dark:text-white disabled:opacity-50 border border-black/10 dark:border-white/10"
							value={max || ''}
						/>
					</label>
					<button className="p-3 m-3 bg-[#2172e5] text-white rounded-md hover:bg-[#4190ff] focus-visible:bg-[#4190ff] disabled:opacity-50">
						Apply Filter
					</button>
				</form>
			</NestedMenu>
		)
	}

	return (
		<Ariakit.PopoverProvider>
			<Ariakit.PopoverDisclosure
				data-variant={variant}
				className={
					variant === 'third'
						? 'flex items-center justify-between gap-2 py-2 px-3 rounded-md cursor-pointer flex-nowrap relative border border-[#E6E6E6] dark:border-[#2F3336] text-[#666] dark:text-[#919296] hover:bg-[var(--link-hover-bg)] focus-visible:bg-[var(--link-hover-bg)] font-medium'
						: variant === 'secondary'
						? 'bg-[var(--btn-bg)] hover:bg-[var(--btn-hover-bg)] focus-visible:bg-[var(--btn-hover-bg)] flex items-center justify-between gap-2 py-2 px-3 rounded-md cursor-pointer text-[var(--text1)] text-xs flex-nowrap'
						: 'bg-[var(--btn2-bg)]  hover:bg-[var(--btn2-hover-bg)] focus-visible:bg-[var(--btn2-hover-bg)] flex items-center justify-between gap-2 py-2 px-3 rounded-lg cursor-pointer text-[var(--text1)] flex-nowrap relative'
				}
			>
				{trigger}
				<Ariakit.PopoverDisclosureArrow className="h-3 w-3" />
			</Ariakit.PopoverDisclosure>
			<Ariakit.Popover
				unmountOnHide
				hideOnInteractOutside
				gutter={6}
				wrapperProps={{
					className: 'max-sm:!fixed max-sm:!bottom-0 max-sm:!top-[unset] max-sm:!transform-none max-sm:!w-full'
				}}
				className="flex flex-col bg-[var(--bg1)] rounded-md z-10 overflow-auto overscroll-contain min-w-[180px] border border-[hsl(204,20%,88%)] dark:border-[hsl(204,3%,32%)] max-sm:drawer h-full max-h-[70vh] sm:max-h-[60vh]"
			>
				<div className="w-[240px] mx-auto">
					<form onSubmit={onSubmit} className="flex flex-col gap-2">
						<label className="flex flex-col gap-1 m-3 mb-0">
							<span>Min</span>
							<input
								type="number"
								name="min"
								className="p-2 rounded-md bg-white dark:bg-black text-black dark:text-white disabled:opacity-50 border border-black/10 dark:border-white/10"
								defaultValue={min || ''}
							/>
						</label>
						<label className="flex flex-col gap-1 m-3 mb-0">
							<span>Max</span>
							<input
								type="number"
								name="max"
								className="p-2 rounded-md bg-white dark:bg-black text-black dark:text-white disabled:opacity-50 border border-black/10 dark:border-white/10"
								defaultValue={max || ''}
							/>
						</label>
						<button className="p-3 mt-3 bg-[#2172e5] text-white rounded-b-md hover:bg-[#4190ff] focus-visible:bg-[#4190ff] disabled:opacity-50">
							Apply Filter
						</button>
					</form>
				</div>
			</Ariakit.Popover>
		</Ariakit.PopoverProvider>
	)
}
