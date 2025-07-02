import { darken, transparentize } from 'polished'
import { ComponentProps, ElementType, forwardRef, ReactNode } from 'react'
import { primaryColor } from '~/constants/colors'

const defaultButtonType = 'button' as const
type ButtonDefaultAsType = typeof defaultButtonType
type ButtonOwnProps<E extends ElementType> = {
	children: ReactNode
	as?: E
	color?: string
	useTextColor?: boolean
}
type ButtonProps<E extends ElementType> = ButtonOwnProps<E> & Omit<ComponentProps<E>, keyof ButtonOwnProps<E>>

export const ButtonDark = <E extends ElementType = ButtonDefaultAsType>({
	children,
	as,
	className,
	style,
	...props
}: ButtonProps<E>) => {
	const Tag = as || defaultButtonType

	return (
		<Tag
			style={
				{
					'--bg-light': '#445ed0',
					'--bg-dark': primaryColor,
					'--bg-active-light': darken(0.1, '#445ed0'),
					'--bg-active-dark': darken(0.1, primaryColor),
					...(style ?? {})
				} as any
			}
			className={`py-2 px-3 rounded-md text-white min-w-fit bg-(--bg-light) dark:bg-(--bg-dark) whitespace-nowrap hover:bg-(--bg-active-light) dark:hover:bg-(--bg-active-dark) focus-visible:bg-(--bg-active-light) dark:focus-visible:bg-(--bg-active-dark) ${
				className ?? ''
			}`}
			{...props}
		>
			{children}
		</Tag>
	)
}

export const ButtonLight = forwardRef(function BLight<E extends ElementType = ButtonDefaultAsType>(
	{ children, as, color, useTextColor, style, className, ...props }: ButtonProps<E>,
	ref
) {
	const Tag = as || defaultButtonType

	return (
		<Tag
			style={
				{
					...(color
						? {
								'--btn2-bg': transparentize(0.9, color),
								'--btn2-hover-bg': transparentize(0.8, color),
								'--btn2-text': darken(0.1, color)
						  }
						: {}),
					...(style ?? {})
				} as any
			}
			className={`flex items-center gap-1 py-2 px-3 rounded-md min-w-fit bg-(--btn2-bg) whitespace-nowrap hover:bg-(--btn2-hover-bg) ${
				useTextColor ? 'text-(--text1)' : 'text-(--btn2-text)'
			} ${className ?? ''}`}
			ref={ref}
			{...props}
		>
			{children}
		</Tag>
	)
})

export const GrayButton = <E extends ElementType = ButtonDefaultAsType>({
	children,
	as,
	className,
	style,
	...props
}: ButtonProps<E>) => {
	const Tag = as || defaultButtonType

	return (
		<Tag
			style={
				{
					'--bg-light': '#eaeaea',
					'--bg-dark': '#22242a',
					'--bg-active-light': darken(0.1, '#eaeaea'),
					'--bg-active-dark': darken(0.1, '#22242a'),
					...(style ?? {})
				} as any
			}
			className={`py-2 px-3 rounded-md text-white min-w-fit bg-(--bg-light) dark:bg-(--bg-dark) whitespace-nowrap hover:bg-(--bg-active-light) dark:hover:bg-(--bg-active-dark) focus-visible:bg-(--bg-active-light) dark:focus-visible:bg-(--bg-active-dark) ${
				className ?? ''
			}`}
			{...props}
		>
			{children}
		</Tag>
	)
}
