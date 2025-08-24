import { FormEventHandler, ReactNode } from 'react'
import * as Ariakit from '@ariakit/react'
import { NestedMenu } from '~/components/NestedMenu'
import { cn } from '~/utils/cn'

interface IFilterBetweenRange {
	name: string
	trigger: ReactNode
	onSubmit: FormEventHandler<HTMLFormElement>
	onClear: () => void
	nestedMenu?: boolean
	min: number | string | null
	max: number | string | null
	variant?: 'primary' | 'secondary'
	triggerClassName?: string
	placement?: Ariakit.PopoverStoreProps['placement']
}

const getVariantClasses = (variant: string) => {
	switch (variant) {
		case 'secondary':
			return 'bg-(--btn-bg) hover:bg-(--btn-hover-bg) focus-visible:bg-(--btn-hover-bg) flex items-center justify-between gap-2 px-3 py-[6px] rounded-md cursor-pointer text-(--text-primary) text-xs flex-nowrap'
		default:
			return 'flex items-center justify-between gap-2 px-2 py-[6px] text-xs rounded-md cursor-pointer flex-nowrap relative border border-(--form-control-border) text-(--text-form) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) font-medium'
	}
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
	triggerClassName,
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
			<Ariakit.PopoverDisclosure data-variant={variant} className={cn(getVariantClasses(variant), triggerClassName)}>
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
				className="max-sm:drawer z-10 flex h-full max-h-[70vh] min-w-[180px] flex-col overflow-auto overscroll-contain rounded-md border border-[hsl(204,20%,88%)] bg-(--bg-main) max-sm:rounded-b-none sm:max-h-[60vh] dark:border-[hsl(204,3%,32%)]"
			>
				<div className="mx-auto w-full sm:w-[260px]">
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
					className="h-9 w-full rounded-md border border-(--form-control-border) bg-white px-3 py-1 text-black disabled:opacity-50 dark:bg-black dark:text-white"
					defaultValue={min || ''}
				/>
			</label>
			<label className="flex flex-col gap-1">
				<span>Max</span>
				<input
					type="number"
					name="max"
					className="h-9 w-full rounded-md border border-(--form-control-border) bg-white px-3 py-1 text-black disabled:opacity-50 dark:bg-black dark:text-white"
					defaultValue={max || ''}
				/>
			</label>

			<div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row">
				<button
					type="reset"
					className="inline-flex h-9 w-full items-center justify-center rounded-md bg-black/5 px-4 text-sm font-medium whitespace-nowrap transition-colors hover:bg-black/10 disabled:opacity-50 dark:bg-white/10 dark:text-white dark:hover:bg-white/20 dark:focus-visible:bg-white/20"
				>
					Clear
				</button>
				<button
					type="submit"
					className="inline-flex h-9 w-full items-center justify-center rounded-md bg-(--link-active-bg) px-4 text-sm font-medium whitespace-nowrap text-white disabled:opacity-50"
				>
					Apply Filter
				</button>
			</div>
		</form>
	)
}
