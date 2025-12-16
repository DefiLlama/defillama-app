import * as React from 'react'
import { cn } from '~/utils/cn'

interface IProps extends React.ComponentProps<'div'> {
	selectedValue: string
	setValue: (period: string) => void
	values: readonly string[]
	style?: Record<string, string>
	triggerClassName?: string
	containerClassName?: string
	buttonClassName?: string
	label?: string
	disabledValues?: readonly string[]
}

export const TagGroup = ({
	selectedValue,
	setValue,
	values,
	style,
	className,
	triggerClassName,
	containerClassName,
	buttonClassName,
	label,
	disabledValues,
	...props
}: IProps) => {
	return (
		<div
			className={
				containerClassName ||
				cn(
					'flex w-fit flex-nowrap items-center overflow-x-auto rounded-md border border-(--form-control-border) text-xs font-medium text-(--text-form)',
					className
				)
			}
			style={style}
			{...props}
		>
			{label && <p className="pr-1 pl-3">{label}</p>}
			{values.map((value) => {
				return (
					<button
						className={
							buttonClassName ||
							cn(
								'shrink-0 px-3 py-1.5 whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) disabled:hover:bg-transparent data-[active=true]:bg-(--old-blue) data-[active=true]:text-white',
								triggerClassName
							)
						}
						disabled={disabledValues?.includes(value)}
						data-active={value === selectedValue}
						key={value}
						onClick={() => setValue(value)}
					>
						{`${value.slice(0, 1).toUpperCase()}${value.slice(1)}`}
					</button>
				)
			})}
		</div>
	)
}
