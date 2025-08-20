import * as React from 'react'
import { cn } from '~/utils/cn'

interface IProps extends React.ComponentProps<'div'> {
	selectedValue: string
	setValue: (period: string) => void
	values: Array<string>
	style?: Record<string, string>
	triggerClassName?: string
	containerClassName?: string
	buttonClassName?: string
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
			{values.map((value) => {
				return (
					<button
						className={
							buttonClassName ||
							cn(
								'shrink-0 px-3 py-[6px] whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:bg-(--old-blue) data-[active=true]:text-white',
								triggerClassName
							)
						}
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
