import React from 'react'
import { cn } from '~/utils/cn'

interface IProps extends React.ComponentProps<'div'> {
	selectedValue: string
	setValue: (period: string) => void
	values: Array<string>
	style?: Record<string, string>
	triggerClassName?: string
}

export const TagGroup = ({ selectedValue, setValue, values, style, className, triggerClassName, ...props }: IProps) => {
	return (
		<div
			className={cn(
				'text-xs font-medium flex items-center rounded-md overflow-x-auto flex-nowrap w-fit border border-(--form-control-border) text-[#666] dark:text-[#919296]',
				className
			)}
			style={style}
			{...props}
		>
			{values.map((value) => {
				return (
					<button
						className={cn(
							'shrink-0 py-2 px-3 whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:bg-(--old-blue) data-[active=true]:text-white',
							triggerClassName
						)}
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
