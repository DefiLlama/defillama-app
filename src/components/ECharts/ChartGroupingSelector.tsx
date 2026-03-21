import * as React from 'react'
import { Tooltip } from '~/components/Tooltip'

export type ChartGroupingOption<T extends string> = {
	value: T
	label: string
	shortLabel?: string
}

export const DWMC_GROUPING_OPTIONS_LOWERCASE = [
	{ value: 'daily', label: 'Daily' },
	{ value: 'weekly', label: 'Weekly' },
	{ value: 'monthly', label: 'Monthly' },
	{ value: 'cumulative', label: 'Cumulative' }
] as const satisfies readonly ChartGroupingOption<'daily' | 'weekly' | 'monthly' | 'cumulative'>[]

export const DWM_GROUPING_OPTIONS_LOWERCASE = [
	{ value: 'daily', label: 'Daily' },
	{ value: 'weekly', label: 'Weekly' },
	{ value: 'monthly', label: 'Monthly' }
] as const satisfies readonly ChartGroupingOption<'daily' | 'weekly' | 'monthly'>[]

export type LowercaseDwmcGrouping = (typeof DWMC_GROUPING_OPTIONS_LOWERCASE)[number]['value']
export type LowercaseDwmGrouping = (typeof DWM_GROUPING_OPTIONS_LOWERCASE)[number]['value']

type BaseProps<T extends string> = {
	value: T
	options: readonly ChartGroupingOption<T>[]
	className?: string
	buttonClassName?: string
}

type LocalStateProps<T extends string> = BaseProps<T> & {
	setValue: React.Dispatch<React.SetStateAction<T>>
	onValueChange?: never
}

type ExternalStateProps<T extends string> = BaseProps<T> & {
	onValueChange: (value: T) => void
	setValue?: never
}

type ChartGroupingSelectorProps<T extends string> = LocalStateProps<T> | ExternalStateProps<T>

const CONTAINER_CLASSNAME =
	'flex w-fit flex-nowrap items-center overflow-x-auto rounded-md border border-(--form-control-border) text-(--text-form)'
const BUTTON_CLASSNAME =
	'shrink-0 px-2 py-1 text-sm whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:font-medium data-[active=true]:text-(--link-text)'

export function ChartGroupingSelector<T extends string>({
	value,
	options,
	className,
	buttonClassName,
	...props
}: ChartGroupingSelectorProps<T>) {
	const handleValueChange = React.useCallback(
		(nextValue: T) => {
			if ('setValue' in props) {
				React.startTransition(() => props.setValue(nextValue))
				return
			}

			props.onValueChange(nextValue)
		},
		[props]
	)

	return (
		<div role="radiogroup" className={className ? `${CONTAINER_CLASSNAME} ${className}` : CONTAINER_CLASSNAME}>
			{options.map((option) => {
				const shortLabel = option.shortLabel ?? option.label.slice(0, 1).toUpperCase()
				return (
					<Tooltip content={option.label} key={option.value}>
						<button
							type="button"
							role="radio"
							aria-checked={value === option.value}
							aria-label={option.label}
							className={buttonClassName ? `${BUTTON_CLASSNAME} ${buttonClassName}` : BUTTON_CLASSNAME}
							data-active={value === option.value}
							onClick={() => handleValueChange(option.value)}
						>
							{shortLabel}
						</button>
					</Tooltip>
				)
			})}
		</div>
	)
}
