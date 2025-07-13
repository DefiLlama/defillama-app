import { FormEventHandler, ReactNode } from 'react'
import * as Ariakit from '@ariakit/react'
import { NestedMenu } from '~/components/NestedMenu'

interface IFilterBetweenRange {
	name: string
	trigger: ReactNode
	onSubmit: FormEventHandler<HTMLFormElement>
	onClear: () => void
	nestedMenu?: boolean
	min: number | string | null
	max: number | string | null
	variant?: 'primary' | 'secondary' | 'third'
	placement?: Ariakit.PopoverStoreProps['placement']
}

export function FilterBetweenRange({
	name,
	trigger,
	onSubmit,
	onClear,
	nestedMenu,
	min,
	max,
	variant = 'primary',
	placement = 'bottom-end'
}: IFilterBetweenRange) {
	const popover = Ariakit.usePopoverStore({
		placement
	})

	if (nestedMenu) {
		return (
			<NestedMenu label={name}>
				<Form onSubmit={onSubmit} onClear={onClear} min={min} max={max} />
			</NestedMenu>
		)
	}

	return (
		<Ariakit.PopoverProvider store={popover}>
			<Ariakit.PopoverDisclosure
				data-variant={variant}
				className={
					variant === 'third'
						? 'flex items-center justify-between gap-2 p-2 text-xs rounded-md cursor-pointer flex-nowrap relative border border-(--form-control-border) text-[#666] dark:text-[#919296] hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) font-medium'
						: variant === 'secondary'
						? 'bg-(--btn-bg) hover:bg-(--btn-hover-bg) focus-visible:bg-(--btn-hover-bg) flex items-center justify-between gap-2 py-2 px-3 rounded-md cursor-pointer text-(--text1) text-xs flex-nowrap'
						: 'bg-(--btn2-bg)  hover:bg-(--btn2-hover-bg) focus-visible:bg-(--btn2-hover-bg) flex items-center justify-between gap-2 py-2 px-3 rounded-lg cursor-pointer text-(--text1) flex-nowrap relative'
				}
			>
				{trigger}
				<Ariakit.PopoverDisclosureArrow className="h-3 w-3 shrink-0" />
			</Ariakit.PopoverDisclosure>

			<Ariakit.Popover
				unmountOnHide
				hideOnInteractOutside
				gutter={6}
				overflowPadding={16} // distance from the boundary edges
				wrapperProps={{
					className: 'max-sm:fixed! max-sm:bottom-0! max-sm:top-[unset]! max-sm:transform-none! max-sm:w-full!'
				}}
				className="flex flex-col bg-(--bg1) rounded-md max-sm:rounded-b-none z-10 overflow-auto overscroll-contain min-w-[180px] border border-[hsl(204,20%,88%)] dark:border-[hsl(204,3%,32%)] max-sm:drawer h-full max-h-[70vh] sm:max-h-[60vh]"
			>
				<div className="w-full sm:w-[260px] mx-auto">
					<Form min={min} max={max} onSubmit={onSubmit} onClear={onClear} />
				</div>
			</Ariakit.Popover>
		</Ariakit.PopoverProvider>
	)
}

function Form({
	onSubmit,
	onClear,
	min,
	max
}: {
	onSubmit: FormEventHandler<HTMLFormElement>
	onClear: () => void
	min: number | string | null
	max: number | string | null
}) {
	return (
		<form onSubmit={onSubmit} onReset={onClear} className="flex flex-col gap-3 p-3">
			<label className="flex flex-col gap-1">
				<span>Min</span>
				<input
					type="number"
					name="min"
					className="h-9 w-full px-3 py-1 rounded-md bg-white dark:bg-black text-black dark:text-white disabled:opacity-50 border border-(--form-control-border)"
					defaultValue={min || ''}
				/>
			</label>
			<label className="flex flex-col gap-1">
				<span>Max</span>
				<input
					type="number"
					name="max"
					className="h-9 w-full px-3 py-1 rounded-md bg-white dark:bg-black text-black dark:text-white disabled:opacity-50 border border-(--form-control-border)"
					defaultValue={max || ''}
				/>
			</label>

			<div className="mt-3 flex gap-2 flex-col-reverse sm:flex-row">
				<button
					type="reset"
					className="inline-flex h-9 px-4 items-center justify-center whitespace-nowrap text-sm font-medium bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:text-white rounded-md dark:hover:bg-white/20 dark:focus-visible:bg-white/20 disabled:opacity-50 transition-colors w-full"
				>
					Clear
				</button>
				<button
					type="submit"
					className="inline-flex h-9 px-4 items-center justify-center whitespace-nowrap text-sm font-medium bg-[#2172e5] text-white rounded-md hover:bg-[#4190ff] focus-visible:bg-[#4190ff] disabled:opacity-50 transition-colors w-full"
				>
					Apply Filter
				</button>
			</div>
		</form>
	)
}
