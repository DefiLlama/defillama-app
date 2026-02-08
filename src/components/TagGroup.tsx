import clsx from 'clsx'
import * as React from 'react'
import { TAG_GROUP_VARIANTS, type TagGroupVariant } from './Select/types'

interface IProps extends React.ComponentProps<'div'> {
	selectedValue: string
	setValue: (period: string) => void
	values: readonly string[]
	style?: Record<string, string>
	variant?: TagGroupVariant
	label?: string
	disabledValues?: readonly string[]
}

export const TagGroup = ({
	selectedValue,
	setValue,
	values,
	style,
	className,
	variant = 'default',
	label,
	disabledValues,
	...props
}: IProps) => {
	const disabledValuesSet = React.useMemo(() => (disabledValues ? new Set(disabledValues) : null), [disabledValues])
	const { container, button } = TAG_GROUP_VARIANTS[variant]

	return (
		<div className={clsx(container, className)} style={style} {...props}>
			{label && <p className="pr-1 pl-3">{label}</p>}
			{values.map((value) => {
				return (
					<button
						className={button}
						disabled={disabledValuesSet?.has(value)}
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
