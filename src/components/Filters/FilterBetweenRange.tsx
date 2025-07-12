import { FormEventHandler, ReactNode } from 'react'
import * as Ariakit from '@ariakit/react'
import { NestedMenu } from '~/components/NestedMenu'
import { cn } from '~/utils/cn'

interface IFilterBetweenRange {
	name: string
	trigger: ReactNode
	onSubmit: FormEventHandler<HTMLFormElement>
	nestedMenu?: boolean
	min: string | null
	max: string | null
	variant?: 'primary' | 'secondary' | 'third'
	triggerClassName?: string
}

const getVariantClasses = (variant: string) => {
	switch (variant) {
		case 'third':
			return 'flex items-center justify-between gap-2 p-2 text-xs rounded-md cursor-pointer flex-nowrap relative border border-(--form-control-border) text-[#666] dark:text-[#919296] hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) font-medium'
		case 'secondary':
			return 'bg-(--btn-bg) hover:bg-(--btn-hover-bg) focus-visible:bg-(--btn-hover-bg) flex items-center justify-between gap-2 py-2 px-3 rounded-md cursor-pointer text-(--text1) text-xs flex-nowrap'
		default:
			return 'bg-(--btn2-bg)  hover:bg-(--btn2-hover-bg) focus-visible:bg-(--btn2-hover-bg) flex items-center justify-between gap-2 py-2 px-3 rounded-lg cursor-pointer text-(--text1) flex-nowrap relative'
	}
}

export function FilterBetweenRange({
	name,
	trigger,
	onSubmit,
	nestedMenu,
	min,
	max,
	variant = 'primary',
	triggerClassName
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
							className="p-2 rounded-md bg-white dark:bg-black text-black dark:text-white disabled:opacity-50 border border-(--form-control-border)"
							value={min || ''}
						/>
					</label>
					<label className="flex flex-col gap-1 m-3 mb-0">
						<span>Max</span>
						<input
							type="number"
							name="max"
							className="p-2 rounded-md bg-white dark:bg-black text-black dark:text-white disabled:opacity-50 border border-(--form-control-border)"
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
			<Ariakit.PopoverDisclosure data-variant={variant} className={cn(getVariantClasses(variant), triggerClassName)}>
				{trigger}
				<Ariakit.PopoverDisclosureArrow className="h-3 w-3 shrink-0" />
			</Ariakit.PopoverDisclosure>
			<Ariakit.Popover
				unmountOnHide
				hideOnInteractOutside
				gutter={6}
				wrapperProps={{
					className: 'max-sm:fixed! max-sm:bottom-0! max-sm:top-[unset]! max-sm:transform-none! max-sm:w-full!'
				}}
				className="flex flex-col bg-(--bg1) rounded-md max-sm:rounded-b-none z-10 overflow-auto overscroll-contain min-w-[180px] border border-[hsl(204,20%,88%)] dark:border-[hsl(204,3%,32%)] max-sm:drawer h-full max-h-[70vh] sm:max-h-[60vh]"
			>
				<div className="w-[240px] mx-auto">
					<form onSubmit={onSubmit} className="flex flex-col gap-2">
						<label className="flex flex-col gap-1 m-3 mb-0">
							<span>Min</span>
							<input
								type="number"
								name="min"
								className="p-2 rounded-md bg-white dark:bg-black text-black dark:text-white disabled:opacity-50 border border-(--form-control-border)"
								defaultValue={min || ''}
							/>
						</label>
						<label className="flex flex-col gap-1 m-3 mb-0">
							<span>Max</span>
							<input
								type="number"
								name="max"
								className="p-2 rounded-md bg-white dark:bg-black text-black dark:text-white disabled:opacity-50 border border-(--form-control-border)"
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
