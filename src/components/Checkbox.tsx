import * as Ariakit from '@ariakit/react'
import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { forwardRef, useState } from 'react'

const CHECKBOX_WRAPPER_VARIANTS = {
	default:
		'group flex cursor-pointer flex-nowrap items-center gap-2 rounded-md bg-(--btn-bg) px-3 py-2 text-xs text-(--text-primary) hover:bg-(--btn-hover-bg) data-focus-visible:bg-(--btn-hover-bg)',
	filter:
		'group flex items-center justify-between gap-2 px-2 py-1.5 text-xs rounded-md cursor-pointer flex-nowrap relative border border-(--form-control-border) text-(--text-form) hover:bg-(--link-hover-bg) data-focus-visible:bg-(--link-hover-bg) font-medium',
	'filter-borderless':
		'group flex flex-row-reverse items-center justify-between gap-4 rounded-md px-3 py-2 text-(--text-primary) cursor-pointer flex-nowrap relative hover:bg-(--primary-hover) data-focus-visible:bg-(--primary-hover)'
} as const

const CHECKBOX_INDICATOR_VARIANTS = {
	default:
		'grid size-4 place-items-center rounded-sm border border-(--text-form)/55 bg-transparent text-transparent group-hover:border-(--text-form)/70 data-[checked=true]:border-(--old-blue) data-[checked=true]:bg-(--old-blue) data-[checked=true]:text-white',
	filter:
		'grid size-4 place-items-center rounded-sm border border-(--form-control-border) bg-transparent text-transparent group-hover:border-(--text-form)/45 data-[checked=true]:border-(--old-blue) data-[checked=true]:bg-(--old-blue) data-[checked=true]:text-white',
	'filter-borderless':
		'grid size-4 place-items-center rounded-sm border border-(--form-control-border) bg-transparent text-transparent group-hover:border-(--text-form)/45 data-[checked=true]:border-(--old-blue) data-[checked=true]:bg-(--old-blue) data-[checked=true]:text-white'
} as const

interface CheckboxProps extends ComponentPropsWithoutRef<'input'> {
	children?: ReactNode
	variant?: keyof typeof CHECKBOX_WRAPPER_VARIANTS
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
	{ children, variant = 'default', ...props },
	ref
) {
	const [checked, setChecked] = useState(props.checked ?? props.defaultChecked ?? false)
	const [focusVisible, setFocusVisible] = useState(false)
	const isChecked = props.checked ?? checked

	return (
		<label
			className={CHECKBOX_WRAPPER_VARIANTS[variant]}
			data-checked={isChecked}
			data-focus-visible={focusVisible || undefined}
		>
			<Ariakit.VisuallyHidden>
				<Ariakit.Checkbox
					{...props}
					ref={ref}
					clickOnEnter
					onFocusVisible={() => setFocusVisible(true)}
					onBlur={() => setFocusVisible(false)}
					onChange={(event) => {
						setChecked(event.target.checked)
						props.onChange?.(event)
					}}
				/>
			</Ariakit.VisuallyHidden>
			<div className={CHECKBOX_INDICATOR_VARIANTS[variant]} data-checked={isChecked}>
				<svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 16 16" height="0.875rem" width="0.875rem">
					<polyline points="4,8 7,12 12,4" />
				</svg>
			</div>
			{children}
		</label>
	)
})
